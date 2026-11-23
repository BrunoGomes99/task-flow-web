import { HttpErrorResponse } from '@angular/common/http';

import type { ProblemDetails, ValidationProblemDetails } from './api-models';
import { API_ERROR_CODES } from './error-codes';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = copyFieldErrors(init.fieldErrors ?? {});
  }
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!isJsonObject(value) || isDomEvent(value)) {
    return false;
  }

  if (
    !isOptionalString(value['type']) ||
    !isOptionalString(value['title']) ||
    !isOptionalNumber(value['status']) ||
    !isOptionalString(value['detail']) ||
    !isOptionalString(value['instance'])
  ) {
    return false;
  }

  return (
    'type' in value ||
    'title' in value ||
    'status' in value ||
    'detail' in value ||
    'instance' in value ||
    'code' in value ||
    'extensions' in value ||
    'errors' in value
  );
}

export function isValidationProblemDetails(value: unknown): value is ValidationProblemDetails {
  return isProblemDetails(value) && isFieldErrorMap(value['errors']);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError({
      status: 500,
      code: API_ERROR_CODES.serverUnexpectedError,
      message: error instanceof Error ? error.message : '',
    });
  }

  if (error.status === 0) {
    return new ApiError({
      status: 0,
      code: API_ERROR_CODES.networkUnreachable,
      message: '',
    });
  }

  const body: unknown = error.error;

  if (isValidationProblemDetails(body)) {
    return new ApiError({
      status: error.status,
      code: readCode(body) ?? API_ERROR_CODES.serverUnexpectedError,
      message: readMessage(body),
      fieldErrors: toFieldErrors(body.errors),
    });
  }

  if (isProblemDetails(body)) {
    return new ApiError({
      status: error.status,
      code: readCode(body) ?? API_ERROR_CODES.serverUnexpectedError,
      message: readMessage(body),
    });
  }

  return new ApiError({
    status: error.status,
    code: API_ERROR_CODES.serverUnexpectedError,
    message: '',
  });
}

// `extensions.code` is the .NET property. System.Text.Json writes Extensions as
// sibling properties, so the JSON body carries `code` directly.
function readCode(body: ProblemDetails): string | undefined {
  const flattened = nonEmptyString(body['code']);
  if (flattened !== undefined) {
    return flattened;
  }

  const extensions = body['extensions'];
  if (!isJsonObject(extensions)) {
    return undefined;
  }

  return nonEmptyString(extensions['code']);
}

function readMessage(body: ProblemDetails): string {
  return nonEmptyString(body.detail) ?? nonEmptyString(body.title) ?? '';
}

function toFieldErrors(
  errors: Record<string, string[] | null> | undefined,
): Record<string, string[]> {
  if (errors === undefined) {
    return {};
  }

  const fieldErrors: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(errors)) {
    if (!Array.isArray(messages)) {
      continue;
    }

    const texts = messages.filter((message): message is string => typeof message === 'string');
    if (texts.length === 0) {
      continue;
    }

    fieldErrors[toCamelCase(key)] = texts;
  }

  return fieldErrors;
}

function toCamelCase(key: string): string {
  return key.slice(0, 1).toLowerCase() + key.slice(1);
}

function copyFieldErrors(fieldErrors: Record<string, string[]>): Record<string, string[]> {
  const copy: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    copy[key] = [...messages];
  }

  return copy;
}

function isFieldErrorMap(value: unknown): value is Record<string, string[] | null> {
  if (!isJsonObject(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) =>
      entry === null || (Array.isArray(entry) && entry.every((item) => typeof item === 'string')),
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDomEvent(value: object): boolean {
  return typeof Event !== 'undefined' && value instanceof Event;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number';
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
