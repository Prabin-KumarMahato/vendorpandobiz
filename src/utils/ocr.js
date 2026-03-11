import Tesseract from "tesseract.js";

export const extractTextFromImage = async (imageFile) => {

  const result = await Tesseract.recognize(
    imageFile,
    "eng",
    {
      logger: (m) => console.log(m)
    }
  );

  return result.data.text;
};