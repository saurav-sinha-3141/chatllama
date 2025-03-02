import axios from "axios";
import { useEffect, useState } from "react";

export default function App() {
  type ModelType = {
    models: { model: string }[];
  };

  const [model, setModel] = useState<ModelType | null>(null);
  const [prompt, setPrompt] = useState("");
  const [chatRes, setChatRes] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get("http://localhost:11434/api/tags");
        setModel(data);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    }
    fetchData();
  }, []);

  async function chat() {
    try {
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: model?.models[0].model,
        prompt: prompt,
      });

      const message = response.data
        .trim()
        .split("\n")
        .map((line: any) => JSON.parse(line))
        .map((obj: any) => obj.response)
        .join("");

      setChatRes(message);
    } catch (error) {
      console.error("Error in chat API:", error);
    }
  }

  // function autoResize(textarea:any) {
  //   textarea.style.height = "auto"; // Reset height
  //   textarea.style.height = textarea.scrollHeight + "px"; // Adjust height based on content
  // }

  return (
    <div className={"bg-black h-screen text-red-800 p-4 flex flex-col items-center space-y-8"}>
      <h1 className="text-3xl font-bold my-5">Chatllama</h1>

      <p>Response: {chatRes}</p>

      <p>
        Model:
        <code className="bg-gray-800 p-2 ml-2 rounded-lg text-slate-300">
          {model?.models[0].model || "Loading..."}
        </code>
      </p>

      <input
        type="text"
        onChange={(e) => setPrompt(e.target.value)}
        className="bg-white focus:outline-none rounded-lg text-black p-5 w-full max-w-4xl max-h-3xl h-20"
        placeholder="Type your prompt..."
      />

      <textarea id="chat-input"
        className="w-full p-2 border rounded-md resize-none overflow-hidden focus:outline-none focus:ring focus:ring-blue-300"
        rows={1}
        placeholder="Type a message..."
      ></textarea>

      <button
        onClick={() => chat()}
        className="m-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 transition duration-200 rounded-lg shadow-md active:scale-95"
      >
        Send
      </button>
    </div>
  );
}
