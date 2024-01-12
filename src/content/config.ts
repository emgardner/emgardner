import { z, defineCollection } from "astro:content";
const weeklyLetterCollection = defineCollection({});
// const blogCollection = defineCollection({});
const obsidianCollection = defineCollection({});

// const blogCollection = defineCollection({
//   type: 'content', // v2.5.0 and later
//   schema: z.object({
//     title: z.string(),
//     tags: z.array(z.string()),
//     image: z.string().optional(),
//   }),
// });
export const collections = {
  newsletter: weeklyLetterCollection,
  // blog: blogCollection,
  obsidian: obsidianCollection
};
