import axios from "axios";
import { useEffect, useState, useRef } from "react";
import OfflineStatus from "./Components/PWA";

export default function ChatLlama() {
  type ModelType = {
    models: { name: string; model: string }[];
  };

  const [model, setModel] = useState<ModelType | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [chatRes, setChatRes] = useState<{ text: string; isUser: boolean }[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchModel() {
      try {
        const { data } = await axios.get("http://localhost:11434/api/tags");
        setModel(data);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].model);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    }
    fetchModel();
  }, []);

  async function chat() {
    if (!prompt.trim()) return;

    const userMessage = { text: prompt, isUser: true };

    setChatRes((prev) => {
      const updatedChat = [...prev, userMessage];
      sendMessage(updatedChat);
      return updatedChat;
    });

    setPrompt("");
    autoResize();
  }

  async function sendMessage(updatedChat: { text: string; isUser: boolean }[]) {
    try {
      const messages = updatedChat
        .map((msg) => (msg.isUser ? `User: ${msg.text}` : `AI: ${msg.text}`))
        .join("\n");

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: `${messages}\nAI:`,
          stream: true,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = { text: "", isUser: false };
      setChatRes((prev) => [...prev, botMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const jsonChunks = chunk.split("\n").filter(Boolean);

        for (const jsonChunk of jsonChunks) {
          try {
            const parsed = JSON.parse(jsonChunk);
            if (parsed.response) {
              botMessage.text += parsed.response;

              setChatRes((prev) => [...prev.slice(0, -1), { ...botMessage }]);
              scrollToBottom();
            }
          } catch (error) {
            console.error("Error parsing JSON chunk:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in chat API:", error);
    }
  }

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="bg-black h-screen text-white flex flex-col">
      <OfflineStatus />

      <header className="p-4 bg-gray-900 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Chatllama</h1>
        <select
          className="bg-gray-800 text-white p-2 rounded-lg appearance-none outline-none cursor-pointer"
          value={selectedModel || "Error"}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {model?.models.map((m) => (
            <option key={m.model} value={m.model} className="bg-gray-900 text-white hover:bg-gray-700">
              {m.name}
            </option>
          ))}
        </select>
      </header>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {chatRes.length > 0 ? (
          chatRes.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[75%] ${msg.isUser ? "bg-gray-800 self-end text-left" : "self-start text-left"}`}
            >
              {msg.text}
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center">No messages yet...</p>
        )}
      </div>

      <div className="p-4 bg-gray-900">
        <div className="flex items-center space-x-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                chat();
              }
            }}
            onChange={(e) => {
              setPrompt(e.target.value);
              autoResize();
            }}
            className="w-full bg-gray-800 text-white p-3 rounded-lg focus:outline-none resize-none overflow-y-auto max-h-[200px]"
            placeholder="Type your message..."
            rows={1}
          />
          <button
            onClick={chat}
            className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg shadow-md transition active:scale-95"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
