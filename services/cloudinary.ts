const CLOUD_NAME = 'dccso5ljv';
const UPLOAD_PRESET = 'dream_wedding_uploads';

export const uploadImage = async (imageUri: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
};

export const uploadMultipleImages = async (imageUris: string[]): Promise<string[]> => {
  const urls = await Promise.all(imageUris.map(uri => uploadImage(uri)));
  return urls;
};
