import { useState } from "react";
import { extractTextFromImage } from "../utils/ocr";

function RequirementForm() {

  const [description, setDescription] = useState("");

  const handleImageUpload = async (e) => {

    const file = e.target.files[0];

    const text = await extractTextFromImage(file);

    setDescription(text);
  };

  return (
    <div>

      <h2>Upload Requirement</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
      />

      <textarea
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
        placeholder="OCR extracted text"
        rows="8"
        cols="50"
      />

    </div>
  );
}

export default RequirementForm;