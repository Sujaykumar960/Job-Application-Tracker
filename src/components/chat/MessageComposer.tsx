import React, { useState, useRef } from 'react';
import { Button } from '../common/Button';
import { ChatAttachment } from '../../api/chatWebSocket';
import { Send, Paperclip, X, FileText, Sparkles } from 'lucide-react';

export interface MessageComposerProps {
  onSendMessage: (text: string, attachment?: ChatAttachment) => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = () => {
    if (!text.trim() && !attachment) return;
    onSendMessage(text.trim(), attachment || undefined);
    setText('');
    setAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment({
        id: `att-${Date.now()}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'doc',
      });
    }
    // reset input so same file can be picked again
    e.target.value = '';
  };

  return (
    <div className="p-3 bg-white border-t border-[#D9D9D9] space-y-2">
      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] text-xs text-[#1D2226] font-mono w-fit animate-in fade-in">
          <FileText className="w-3.5 h-3.5 text-[#0A66C2]" />
          <span className="truncate max-w-[200px]">{attachment.name}</span>
          <span className="text-[10px] text-[#788896]">({attachment.size})</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="text-[#788896] hover:text-[#B3261E] ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.ts,.go"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-xl bg-[#F3F6F8] hover:bg-white text-[#56687A] hover:text-[#0A66C2] border border-[#D9D9D9] transition flex-shrink-0"
          title="Attach PDF, code, or image"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Message Input Textarea */}
        <div className="flex-1 relative">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Write a message... (Press Enter to send, Shift+Enter for new line)"
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] p-2.5 max-h-28 min-h-[38px] focus:outline-none focus:ring-1 focus:ring-[#0A66C2] resize-none leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <Button
          size="sm"
          variant="primary"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachment)}
          icon={<Send className="w-3.5 h-3.5" />}
          className="flex-shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
