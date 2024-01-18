import { defineCollection } from "astro:content";
const postsCollection = defineCollection({});
const weeklyNotesCollection = defineCollection({});

export const collections = {
  posts: postsCollection,
  'weekly-notes': weeklyNotesCollection
};

// const weeklyLetterCollection = defineCollection({});
// const blogCollection = defineCollection({});
// const blogCollection = defineCollection({
//   type: 'content', // v2.5.0 and later
//   schema: z.object({
//     title: z.string(),
//     tags: z.array(z.string()),
//     image: z.string().optional(),
//   }),
// });
// newsletter: weeklyLetterCollection,
// blog: blogCollection,
