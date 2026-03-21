import { supportedPlatforms } from '../utils/llm/platforms';

export default defineEventHandler(() => {
  return supportedPlatforms;
});