export class TicketModuleError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'TicketModuleError';
  }
}

export function assertOrFail(
  condition: unknown,
  code: string,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) {
    throw new TicketModuleError(code, message, status);
  }
}
