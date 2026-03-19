import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
 
// Pre-built UI components (optional — you don't use these in CropDiagnosticPage,
// but they're handy if you ever want a quick drop-in uploader elsewhere)
export const UploadButton   = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
 
// The hook used in CropDiagnosticPage:
//   const { startUpload } = useUploadThing("cropImageUploader")
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
 