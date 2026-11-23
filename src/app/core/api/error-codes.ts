export const API_ERROR_CODES = {
  authInvalidCredentials: 'auth.invalid_credentials',
  userEmailAlreadyInUse: 'user.email_already_in_use',
  taskNotFound: 'task.not_found',
  taskLocked: 'task.locked',
  taskStatusTransitionInvalid: 'task.status_transition_invalid',
  taskDueDateInPast: 'task.due_date_in_past',
  requestValidationFailed: 'request.validation_failed',
  networkUnreachable: 'network.unreachable',
  serverUnexpectedError: 'server.unexpected_error',
} as const;
