import { NextRequest, NextResponse } from 'next/server';
import { ensureIzipayCredentials } from '@payment/izipay/config';
import { verifyIzipaySignature, computeIzipaySignature } from '@payment/izipay/signature';
import { refreshPaymentStatus, extractOrderCode } from '@ticket/lib/payments';

function parseBody(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  } catch {
    // fall back to urlencoded
  }
  const params = new URLSearchParams(raw);
  const result: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function extractStatus(answer: Record<string, unknown>) {
  if (typeof answer.orderStatus === 'string') return answer.orderStatus;
  if (typeof answer.transactionStatus === 'string') return answer.transactionStatus;
  const payment = answer.payment as Record<string, unknown> | undefined;
  if (payment) {
    if (typeof payment.orderStatus === 'string') return payment.orderStatus;
    if (typeof payment.transactionStatus === 'string') return payment.transactionStatus;
  }
  const transactions = answer.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const latest = transactions[transactions.length - 1];
    if (latest && typeof latest.status === 'string') return latest.status;
  }
  return undefined;
}

function extractUuid(answer: Record<string, unknown>) {
  if (typeof answer.transactionUuid === 'string') return answer.transactionUuid;
  const transactions = answer.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const latest = transactions[transactions.length - 1];
    if (latest && typeof latest.uuid === 'string') return latest.uuid;
    if (latest && typeof latest.uuidTransaction === 'string') return latest.uuidTransaction;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  ensureIzipayCredentials();
  const rawBody = await req.text();
  const body = parseBody(rawBody);
  const answerRaw = body['kr-answer'];
  if (typeof answerRaw !== 'string' || !answerRaw.trim()) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const signature =
    (typeof body['kr-hash'] === 'string' ? body['kr-hash'] : undefined) ??
    req.headers.get('x-kr-hash') ??
    req.headers.get('kr-hash');

  const hashKey = typeof body['kr-hash-key'] === 'string' && body['kr-hash-key'].length > 0
    ? body['kr-hash-key']
    : undefined;

  if (!verifyIzipaySignature(answerRaw, signature, hashKey)) {
    const expected = computeIzipaySignature(answerRaw, hashKey);
    console.warn('[izipay:webhook] firma inválida', {
      received: signature,
      expected,
      hasSignature: Boolean(signature),
      answerRaw,
      rawBody,
      hashKey,
    });
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  let answer: Record<string, unknown>;
  try {
    answer = JSON.parse(answerRaw) as Record<string, unknown>;
  } catch (error) {
    console.error('[izipay:webhook] no se pudo parsear answer', error);
    return NextResponse.json({ error: 'INVALID_ANSWER' }, { status: 400 });
  }

  const orderCode = extractOrderCode(answer);
  if (!orderCode) {
    console.error('[izipay:webhook] no se encontró orderId en answer', answer);
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 400 });
  }

  const providerStatus = extractStatus(answer);
  const transactionUuid = extractUuid(answer);

  try {
    const result = await refreshPaymentStatus({
      orderCode,
      providerStatus: providerStatus ?? null,
      providerMessage: null,
      transactionUuid: transactionUuid ?? null,
      rawAnswer: answer,
      origin: 'webhook',
    });
    return NextResponse.json(
      {
        ok: true,
        paymentStatus: result.paymentStatus,
        orderCode: result.orderCode,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[izipay:webhook] error al actualizar', error);
    return NextResponse.json({ error: 'PROCESSING_ERROR' }, { status: 500 });
  }
}
