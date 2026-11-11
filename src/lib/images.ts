/** Pictures over this size get a gentle warning: they're stored inside the timeline. */
export const BIG_IMAGE = 5 * 1024 * 1024;

/** Reads a picked image file as a data: URL and measures it. */
export async function readImage(file: File): Promise<{ image: string; width: number; height: number }> {
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read "${file.name}"`));
    reader.readAsDataURL(file);
  });
  // Load it once to learn its size (and that it really is an image)
  const { width, height } = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`"${file.name}" isn't an image this browser can show`));
    img.src = image;
  });
  return { image, width, height };
}

/** The warning for a big picture, or null. */
export const bigImageNote = (file: File) =>
  file.size > BIG_IMAGE
    ? `That's a big picture (${Math.round(file.size / 1024 / 1024)} MB). It's saved inside the timeline, so exports and websites get bigger too. A smaller JPEG or WebP works just as well.`
    : null;
