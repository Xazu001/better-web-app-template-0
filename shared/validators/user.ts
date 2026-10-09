import { z } from "zod";

export const UpdateUsernameSchema = z.object({
  user_name: z.string().min(1).max(64)
});
