import { authHandlers } from './auth';
import { controlHandlers } from './control';

export const handlers = [...controlHandlers, ...authHandlers];
