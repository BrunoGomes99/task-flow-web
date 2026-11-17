import type { components } from './generated/api-types';

type Schemas = components['schemas'];

export type TaskDto = Schemas['TaskDto'];
export type TaskSummaryDto = Schemas['TaskSummaryDto'];
export type LoginResponse = Schemas['LoginResponse'];
export type UserDto = Schemas['UserDto'];
export type PagedTaskDto = Schemas['TaskDtoPagedResult'];
export type ProblemDetails = Schemas['ProblemDetails'];
export type TaskStatus = Schemas['TaskStatus'];
export type DueDateOrder = Schemas['DueDateOrder'];

// Swagger types every error as ProblemDetails. Validation responses also include
// `errors`; that schema is not in the snapshot.
export type ValidationProblemDetails = ProblemDetails & {
  errors?: Record<string, string[] | null>;
};
