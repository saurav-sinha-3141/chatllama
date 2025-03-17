import axios from "axios";
import { useEffect, useState, useRef } from "react";
import OfflineStatus from "./Components/OfflineStatus";

export default function ChatLlama() {
  type Role = "system" | "user" | "assistant" | "tool";

  type Model = {
    models: { name: string; model: string }[];
  };

  type Message = {
    messages: { role: Role; content: string }[];
  };

  const [model, setModel] = useState<Model | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message>({ messages: [] });
  const [prompt, setPrompt] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const { data } = await axios.get("http://localhost:11434/api/tags");
        setModel(data);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].model);
        }

        await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: [],
            stream: true,
          }),
        });
      } catch (error) {
        console.error("Error fetching models:", error);
        setSelectedModel("Error");
      }
    }
    fetchModels();
  }, []);

  async function chat() {
    if (!prompt.trim()) return;

    const userMessage = { role: "user" as Role, content: prompt };

    setMessages((prev) => {
      const updatedChat = [...prev.messages, userMessage];
      sendMessage({ messages: updatedChat });
      return { messages: updatedChat };
    });

    setPrompt("");
    autoResize();
  }

  async function sendMessage(chatContext: Message) {
    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatContext.messages,
          stream: true,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = { role: "assistant" as Role, content: "" };

      setMessages((prev) => ({
        messages: [...prev.messages, botMessage],
      }));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const jsonChunks = chunk.split("\n").filter(Boolean);

        for (const jsonChunk of jsonChunks) {
          try {
            const parsed = JSON.parse(jsonChunk);

            if (parsed.message?.content) {
              botMessage.content += parsed.message.content;

              setMessages((prev) => ({
                messages: [...prev.messages.slice(0, -1), { ...botMessage }],
              }));

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
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
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
    <>
      <OfflineStatus />
      <div className="bg-black h-screen text-white flex flex-col">
        <header className="p-4 bg-gray-900 flex justify-between items-center shadow-md">
          <h1 className="text-xl font-bold">Chatllama</h1>
          <select
            className="bg-gray-800 text-white p-2 rounded-lg appearance-none outline-none cursor-pointer"
            value={selectedModel || ""}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {model?.models && model.models.length > 0 ? (
              model.models.map((model) => (
                <option
                  key={model.model}
                  value={model.model}
                  className="bg-gray-900 text-white hover:bg-gray-700"
                >
                  {model.name}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No models available
              </option>
            )}
          </select>
        </header>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col"
        >
          {messages.messages.length > 0 ? (
            messages.messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[75%] 
                  ${
                    msg.role === "user" || msg.role === "system"
                      ? "bg-gray-800 self-end text-left"
                      : "self-start text-left"
                  }`}
              >
                {msg.content}
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
              className="bg-white hover:bg-slate-300 text-gray-800 hover:text-black cursor-pointer px-4 py-2 rounded-lg shadow-md transition active:scale-95"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
