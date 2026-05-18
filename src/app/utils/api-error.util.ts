type ValidationErrorLocation = Array<string | number>;

type ApiValidationError = {
  loc: ValidationErrorLocation;
  msg: string;
  type: string;
};

type ApiErrorResponse = {
  detail?: string | ApiValidationError[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isApiValidationError(value: unknown): value is ApiValidationError {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value['loc']) &&
    typeof value['msg'] === 'string' &&
    typeof value['type'] === 'string'
  );
}

function extractDetailMessage(
  detail: ApiErrorResponse['detail'],
): string | null {
  if (typeof detail === 'string') {
    const trimmed = detail.trim();
    return trimmed || null;
  }

  if (!Array.isArray(detail)) {
    return null;
  }

  const messages = detail
    .filter(isApiValidationError)
    .map((item) => item.msg.trim())
    .filter(Boolean);

  return messages.length ? messages.join('\n') : null;
}

export function extractApiErrorMessage(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  return extractDetailMessage((error as ApiErrorResponse).detail);
}

export function resolveApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return extractApiErrorMessage(error) ?? fallbackMessage;
}
