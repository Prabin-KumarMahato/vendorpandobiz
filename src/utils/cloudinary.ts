export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing in the .env file');
  }

  // Cloudinary requires a timestamp for signature
  const timestamp = Math.round((new Date).getTime() / 1000);
  
  // The signature string must consist of the parameters being passed, sorted alphabetically, followed by the API secret.
  const signatureString = `timestamp=${timestamp}${apiSecret}`;

  // Generate SHA-1 hash for the signature using Web Crypto API
  const msgBuffer = new TextEncoder().encode(signatureString);
  const hashBuffer = await window.crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  // Use /auto/upload to handle both images and raw files (like PDFs) automatically
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
};
