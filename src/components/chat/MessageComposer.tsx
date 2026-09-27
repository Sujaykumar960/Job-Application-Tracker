import React, { useState, useRef } from 'react';
import { Button } from '../common/Button';
import { ChatAttachment } from '../../api/chatWebSocket';
import { Send, Paperclip, X, FileText } from 'lucide-react';

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
    e.target.value = '';
  };

  return (
    <div className="p-3 sm:p-3.5 bg-white dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-[#1E293B] space-y-2">
      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] text-xs text-slate-800 dark:text-[#F8FAFC] font-mono w-fit animate-in fade-in">
          <FileText className="w-4 h-4 text-[#0A66C2] dark:text-[#38BDF8]" />
          <span className="truncate max-w-[240px] font-medium">{attachment.name}</span>
          <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">({attachment.size})</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-1 p-0.5"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
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
          className="h-[42px] w-[42px] rounded-xl bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#28384E] text-slate-500 dark:text-[#94A3B8] hover:text-[#0A66C2] dark:hover:text-[#38BDF8] border border-slate-200 dark:border-[#475569] transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50"
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
            className="w-full bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100/50 dark:hover:bg-[#243348] focus:bg-white dark:focus:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] text-[13.5px] sm:text-sm rounded-xl border border-slate-200 dark:border-[#475569] p-2.5 min-h-[42px] max-h-28 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-[#38BDF8] focus:border-[#0A66C2] dark:focus:border-[#38BDF8] resize-none leading-relaxed transition-colors"
          />
        </div>

        {/* Send Button */}
        <Button
          size="sm"
          variant="primary"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachment)}
          icon={<Send className="w-3.5 h-3.5" />}
          className="h-[42px] px-4 rounded-xl flex-shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
