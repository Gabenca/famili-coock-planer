import { randomUUID } from "crypto";

const maxRecipePhotoBytes = 5 * 1024 * 1024;
const signedUrlExpiresInSeconds = 60 * 60 * 24 * 7;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export class RecipePhotoValidationError extends Error {
  constructor(message = "Invalid recipe photo") {
    super(message);
    this.name = "RecipePhotoValidationError";
  }
}

export async function uploadRecipePhoto(householdId: string, file: File) {
  const extension = validateRecipePhoto(file);
  const config = getStorageConfig();
  const objectKey = `households/${householdId}/recipes/${randomUUID()}.${extension}`;
  const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${objectKey}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": file.type,
      "x-upsert": "false"
    },
    body: await readFileBytes(file)
  });

  if (!response.ok) {
    throw new RecipePhotoValidationError("Recipe photo upload failed");
  }

  return objectKey;
}

export async function getRecipePhotoUrl(objectKey: string | null) {
  if (!objectKey) {
    return null;
  }

  const config = getStorageConfig();
  const response = await fetch(`${config.url}/storage/v1/object/sign/${config.bucket}/${objectKey}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ expiresIn: signedUrlExpiresInSeconds })
  });

  if (!response.ok) {
    throw new RecipePhotoValidationError("Recipe photo URL signing failed");
  }

  const result = (await response.json()) as { signedURL?: string };

  if (!result.signedURL) {
    throw new RecipePhotoValidationError("Recipe photo URL missing");
  }

  return result.signedURL.startsWith("/") ? `${config.url}${result.signedURL}` : result.signedURL;
}

export async function deleteRecipePhotoObject(objectKey: string | null) {
  if (!objectKey) {
    return;
  }

  const config = getStorageConfig();
  const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}`, {
    method: "DELETE",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ prefixes: [objectKey] })
  });

  if (!response.ok) {
    throw new RecipePhotoValidationError("Recipe photo delete failed");
  }
}

function validateRecipePhoto(file: File) {
  const extension = allowedImageTypes.get(file.type);

  if (!extension || file.size > maxRecipePhotoBytes) {
    throw new RecipePhotoValidationError();
  }

  return extension;
}

async function readFileBytes(file: File) {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Response(file).arrayBuffer();
}

function getStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/g, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_RECIPE_BUCKET;

  if (!url || !serviceRoleKey || !bucket) {
    throw new RecipePhotoValidationError("Recipe photo storage is not configured");
  }

  return {
    url,
    serviceRoleKey,
    bucket
  };
}
