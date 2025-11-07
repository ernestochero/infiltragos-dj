type JsonRecord = Record<string, unknown>;

export type ThreeDSInfo = {
  raw: JsonRecord;
  transStatus?: string;
  status?: string;
  challengeResult?: string;
  statusReason?: string;
  reasonCode?: string;
  reasonMessage?: string;
  flow?: string;
  version?: string;
};

export type ThreeDSFailure = {
  code: string;
  message: string;
  info: ThreeDSInfo;
};

const DECLINE_TRANS_STATUS = new Set(['N', 'U', 'R', 'T']);
const DECLINE_CHALLENGE_RESULTS = new Set([
  'ABANDONED',
  'CANCELED',
  'CANCELLED',
  'FAILED',
  'REJECTED',
  'TIMEOUT',
  'NOTDONE',
  'NOT_DONE',
  'NOT DONE',
]);
const DECLINE_STATUS_PREFIXES = ['FAIL', 'ERROR', 'DECLIN', 'REFUS'];

const TRANS_STATUS_DESCRIPTIONS: Record<string, string> = {
  Y: 'Autenticado',
  A: 'Intento aceptado',
  N: 'Autenticación fallida',
  U: 'Autenticador no disponible',
  R: 'Challenge rechazado',
  T: 'Challenge vencido (timeout)',
  C: 'Challenge requerido',
  D: 'Challenge completado',
};

export function detectThreeDSFailure(answer: unknown): ThreeDSFailure | null {
  const info = extractThreeDSInfo(answer);
  if (!info) return null;
  return evaluateThreeDSFailure(info);
}

export function extractThreeDSInfo(answer: unknown): ThreeDSInfo | null {
  const node = findThreeDSNode(answer);
  if (!node) return null;
  return {
    raw: node,
    transStatus: readString(node, 'transStatus', 'trans_status'),
    status: readString(node, 'status', 'result', 'threeDSStatus'),
    challengeResult: readString(node, 'challengeResult', 'challengeStatus'),
    statusReason: readString(node, 'transStatusReason', 'statusReason'),
    reasonCode: readString(node, 'reasonCode', 'errorCode', 'detailedReasonCode'),
    reasonMessage: readString(node, 'reasonMessage', 'message', 'detailedReasonMessage'),
    flow: readString(node, 'flow', 'threeDSFlow', 'authenticationFlow'),
    version: readString(node, 'version', 'protocolVersion', 'messageVersion'),
  };
}

export function evaluateThreeDSFailure(info: ThreeDSInfo): ThreeDSFailure | null {
  const trans = normalizeValue(info.transStatus);
  if (trans && DECLINE_TRANS_STATUS.has(trans)) {
    return {
      code: `3DS_TRANS_${trans}`,
      message: buildMessage('transStatus', trans, info),
      info,
    };
  }

  const challenge = normalizeValue(info.challengeResult);
  if (challenge && DECLINE_CHALLENGE_RESULTS.has(challenge)) {
    return {
      code: `3DS_CHALLENGE_${challenge}`,
      message: buildMessage('challengeResult', challenge, info),
      info,
    };
  }

  const status = normalizeValue(info.status);
  if (status && DECLINE_STATUS_PREFIXES.some((prefix) => status.startsWith(prefix))) {
    return {
      code: `3DS_STATUS_${status}`,
      message: buildMessage('status', status, info),
      info,
    };
  }

  const statusReason = normalizeValue(info.statusReason);
  if (statusReason && DECLINE_STATUS_PREFIXES.some((prefix) => statusReason.startsWith(prefix))) {
    return {
      code: `3DS_STATUS_REASON_${statusReason}`,
      message: buildMessage('statusReason', statusReason, info),
      info,
    };
  }

  return null;
}

function buildMessage(context: string, code: string, info: ThreeDSInfo) {
  const pieces: string[] = ['Autenticación 3DS rechazada'];
  if (context === 'transStatus') {
    const readable = TRANS_STATUS_DESCRIPTIONS[code];
    if (readable) pieces.push(readable);
    pieces.push(`transStatus=${code}`);
  } else if (context === 'challengeResult') {
    pieces.push(`challenge=${code}`);
  } else if (context === 'status') {
    pieces.push(`status=${code}`);
  } else if (context === 'statusReason') {
    pieces.push(`motivo=${code}`);
  }
  const extra: string[] = [];
  if (info.reasonMessage) extra.push(info.reasonMessage);
  if (!info.reasonMessage && info.statusReason && context !== 'statusReason') {
    extra.push(info.statusReason);
  }
  if (info.reasonCode) extra.push(`código ${info.reasonCode}`);
  if (info.challengeResult && context !== 'challengeResult') {
    extra.push(`challenge=${info.challengeResult}`);
  }
  const suffix = extra.length ? ` · ${dedupeStrings(extra).join(' · ')}` : '';
  return dedupeStrings(pieces).join(' · ') + suffix;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized) return false;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function normalizeValue(value?: string | null) {
  return value ? value.trim().toUpperCase() : undefined;
}

function findThreeDSNode(value: unknown, depth = 0): JsonRecord | undefined {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = findThreeDSNode(entry, depth + 1);
      if (result) return result;
    }
    return undefined;
  }
  const record = toRecord(value);
  if (!record) return undefined;

  for (const [key, child] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey.includes('threedsauthentication') || normalizedKey === 'threeds') {
      const nested = findThreeDSNode(child, depth + 1);
      if (nested) return nested;
      if (toRecord(child)) return child as JsonRecord;
    }
  }

  if (looksLikeThreeDS(record)) return record;

  for (const child of Object.values(record)) {
    const result = findThreeDSNode(child, depth + 1);
    if (result) return result;
  }

  return undefined;
}

function looksLikeThreeDS(record: JsonRecord) {
  const keys = Object.keys(record).map((key) => normalizeKey(key));
  if (keys.some((key) => key.includes('threeds'))) return true;
  if (keys.includes('transstatus')) return true;
  if (keys.includes('challengeresult') || keys.includes('challengestatus')) return true;
  if (keys.includes('threedsstatus') || keys.includes('threedsflow')) return true;
  return false;
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function toRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function readString(record: JsonRecord, ...candidates: string[]) {
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    for (const [key, value] of Object.entries(record)) {
      if (normalizeKey(key) === normalized && typeof value === 'string') {
        return value;
      }
    }
  }
  return undefined;
}
