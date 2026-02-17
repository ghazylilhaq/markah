import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e",
];

async function main() {
  // Upsert test user (idempotent)
  const user = await prisma.user.upsert({
    where: { email: "test@markah.com" },
    update: {},
    create: {
      email: "test@markah.com",
      name: "Test User",
      password: hashSync("password123", 10),
    },
  });

  console.log(`User: ${user.email} (${user.id})`);

  // Clean existing data for idempotency
  await prisma.bookmarkTag.deleteMany({ where: { bookmark: { userId: user.id } } });
  await prisma.bookmarkFolder.deleteMany({ where: { bookmark: { userId: user.id } } });
  await prisma.bookmark.deleteMany({ where: { userId: user.id } });
  await prisma.folder.deleteMany({ where: { userId: user.id } });
  await prisma.tag.deleteMany({ where: { userId: user.id } });

  // Create tags
  const tagNames = ["javascript", "react", "design", "devtools", "news", "tutorial", "python", "ai"];
  const tags = await Promise.all(
    tagNames.map((name, i) =>
      prisma.tag.create({
        data: { name, color: TAG_COLORS[i % TAG_COLORS.length], userId: user.id },
      })
    )
  );
  console.log(`Created ${tags.length} tags`);

  // Create folders (3 folders, one nested)
  const devFolder = await prisma.folder.create({
    data: { name: "Development", position: 0, userId: user.id },
  });
  const designFolder = await prisma.folder.create({
    data: { name: "Design", position: 1, userId: user.id },
  });
  const reactFolder = await prisma.folder.create({
    data: { name: "React Resources", position: 0, parentId: devFolder.id, userId: user.id },
  });
  console.log(`Created 3 folders (React Resources nested under Development)`);

  // Create bookmarks
  const bookmarks = await Promise.all([
    prisma.bookmark.create({
      data: {
        url: "https://react.dev",
        title: "React – The library for web and native user interfaces",
        description: "React lets you build user interfaces out of individual pieces called components.",
        image: "https://react.dev/images/og-home.png",
        favicon: "https://react.dev/favicon-32x32.png",
        isFavorite: true,
        position: 0,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://nextjs.org",
        title: "Next.js by Vercel – The React Framework",
        description: "Next.js enables you to create high-quality web applications with the power of React components.",
        image: "https://nextjs.org/static/twitter-cards/home.jpg",
        favicon: "https://nextjs.org/favicon.ico",
        isFavorite: true,
        position: 1,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://tailwindcss.com",
        title: "Tailwind CSS – Rapidly build modern websites without ever leaving your HTML",
        description: "A utility-first CSS framework packed with classes that can be composed to build any design, directly in your markup.",
        image: "https://tailwindcss.com/_next/static/media/social-card-large.a6e71726.jpg",
        favicon: "https://tailwindcss.com/favicons/favicon-32x32.png",
        position: 2,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://www.typescriptlang.org",
        title: "TypeScript: JavaScript With Syntax For Types",
        description: "TypeScript extends JavaScript by adding types to the language.",
        favicon: "https://www.typescriptlang.org/favicon-32x32.png",
        isFavorite: true,
        position: 3,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://prisma.io",
        title: "Prisma | Simplify working and interacting with databases",
        description: "Prisma provides the best experience for your team to work and interact with databases.",
        image: "https://www.prisma.io/images/og-image.png",
        favicon: "https://www.prisma.io/favicon.ico",
        position: 4,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        title: "JavaScript | MDN",
        description: "JavaScript (JS) is a lightweight interpreted programming language with first-class functions.",
        favicon: "https://developer.mozilla.org/favicon-48x48.png",
        position: 5,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://figma.com",
        title: "Figma: The Collaborative Interface Design Tool",
        description: "Figma helps teams create, test, and ship better designs from start to finish.",
        image: "https://static.figma.com/app/icon/1/favicon.png",
        favicon: "https://static.figma.com/app/icon/1/favicon.png",
        position: 6,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://news.ycombinator.com",
        title: "Hacker News",
        description: "Social news website focusing on computer science and entrepreneurship.",
        favicon: "https://news.ycombinator.com/favicon.ico",
        visitCount: 15,
        lastVisitedAt: new Date(),
        position: 7,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://github.com",
        title: "GitHub: Let's build from here",
        description: "GitHub is where over 100 million developers shape the future of software, together.",
        image: "https://github.githubassets.com/assets/github-logo-55c5b2.png",
        favicon: "https://github.githubassets.com/favicons/favicon.png",
        isFavorite: true,
        visitCount: 42,
        lastVisitedAt: new Date(),
        position: 8,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://ui.shadcn.com",
        title: "shadcn/ui – Beautifully designed components",
        description: "Beautifully designed components that you can copy and paste into your apps.",
        favicon: "https://ui.shadcn.com/favicon.ico",
        position: 9,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://python.org",
        title: "Welcome to Python.org",
        description: "The official home of the Python Programming Language.",
        favicon: "https://www.python.org/static/favicon.ico",
        position: 10,
        userId: user.id,
      },
    }),
    prisma.bookmark.create({
      data: {
        url: "https://platform.openai.com/docs",
        title: "OpenAI API Documentation",
        description: "Explore developer resources, tutorials, API docs, and dynamic examples to get the most out of OpenAI's platform.",
        favicon: "https://platform.openai.com/favicon.ico",
        position: 11,
        userId: user.id,
      },
    }),
  ]);
  console.log(`Created ${bookmarks.length} bookmarks`);

  // Tag assignments
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]));
  const tagAssignments: { bookmarkIdx: number; tagName: string }[] = [
    { bookmarkIdx: 0, tagName: "react" },
    { bookmarkIdx: 0, tagName: "javascript" },
    { bookmarkIdx: 1, tagName: "react" },
    { bookmarkIdx: 1, tagName: "javascript" },
    { bookmarkIdx: 2, tagName: "design" },
    { bookmarkIdx: 3, tagName: "javascript" },
    { bookmarkIdx: 3, tagName: "devtools" },
    { bookmarkIdx: 4, tagName: "devtools" },
    { bookmarkIdx: 5, tagName: "javascript" },
    { bookmarkIdx: 5, tagName: "tutorial" },
    { bookmarkIdx: 6, tagName: "design" },
    { bookmarkIdx: 7, tagName: "news" },
    { bookmarkIdx: 8, tagName: "devtools" },
    { bookmarkIdx: 9, tagName: "react" },
    { bookmarkIdx: 9, tagName: "design" },
    { bookmarkIdx: 10, tagName: "python" },
    { bookmarkIdx: 10, tagName: "tutorial" },
    { bookmarkIdx: 11, tagName: "ai" },
    { bookmarkIdx: 11, tagName: "tutorial" },
  ];

  await prisma.bookmarkTag.createMany({
    data: tagAssignments.map((a) => ({
      bookmarkId: bookmarks[a.bookmarkIdx].id,
      tagId: tagMap[a.tagName],
    })),
  });
  console.log(`Created ${tagAssignments.length} bookmark-tag associations`);

  // Folder assignments
  const folderAssignments: { bookmarkIdx: number; folderId: string }[] = [
    { bookmarkIdx: 0, folderId: reactFolder.id },
    { bookmarkIdx: 1, folderId: reactFolder.id },
    { bookmarkIdx: 2, folderId: devFolder.id },
    { bookmarkIdx: 3, folderId: devFolder.id },
    { bookmarkIdx: 4, folderId: devFolder.id },
    { bookmarkIdx: 5, folderId: devFolder.id },
    { bookmarkIdx: 6, folderId: designFolder.id },
    { bookmarkIdx: 9, folderId: designFolder.id },
  ];

  await prisma.bookmarkFolder.createMany({
    data: folderAssignments.map((a) => ({
      bookmarkId: bookmarks[a.bookmarkIdx].id,
      folderId: a.folderId,
    })),
  });
  console.log(`Created ${folderAssignments.length} bookmark-folder associations`);

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
