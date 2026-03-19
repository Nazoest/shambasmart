import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  /**
   * cropImageUploader — single image, used on the diagnostic page
   */
  cropImageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Add auth here if needed, e.g. check session
      return { uploadedBy: "farmer" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Crop image uploaded:", file.url);
      // TODO: call your ML prediction backend here
      return { uploadedFileUrl: file.url };
    }),

  /**
   * cropImageBulkUploader — multiple images, used on the image library page
   */
  cropImageBulkUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10, // up to 10 images per batch
    },
  })
    .middleware(async ({ req }) => {
      return { uploadedBy: "farmer" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Bulk image uploaded:", file.url);
      return { uploadedFileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;