import React from 'react';
import { ChatMessage } from '../../api/chatWebSocket';
import { Check, CheckCheck, FileText, Download, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOut = message.isOutgoing;

  return (
    <div
      className={cn(
        'flex flex-col space-y-1 max-w-[80%] sm:max-w-[70%]',
        isOut ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Bubble Container */}
      <div
        className={cn(
          'p-3 rounded-2xl text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap',
          isOut
            ? 'bg-[#0A66C2] text-white rounded-tr-xs'
            : 'bg-[#F3F6F8] text-[#1D2226] border border-[#E8E8E8] rounded-tl-xs'
        )}
      >
        {/* Message Text */}
        <p>{message.content}</p>

        {/* Optional Attachment Card */}
        {message.attachment && (
          <div
            className={cn(
              'mt-2.5 p-2.5 rounded-xl flex items-center justify-between gap-3 border font-mono text-[11px]',
              isOut
                ? 'bg-[#004182]/80 border-blue-400/40 text-white'
                : 'bg-white border-[#D9D9D9] text-[#1D2226]'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                isOut ? 'bg-white/20 text-white' : 'bg-[#E8F3FF] text-[#0A66C2]'
              )}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{message.attachment.name}</p>
                <span className="text-[10px] opacity-75">{message.attachment.size}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const element = document.createElement('a');
                const file = new Blob(
                  [`CareerX Secure Attachment\nFile: ${message.attachment?.name || 'document.pdf'}\nSize: ${message.attachment?.size || '1.0MB'}`],
                  { type: 'text/plain' }
                );
                element.href = URL.createObjectURL(file);
                element.download = message.attachment?.name || 'attachment.txt';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="p-1 hover:opacity-80 transition"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Timestamp & Delivery Receipts */}
      <div
        className={cn(
          'flex items-center gap-1 text-[10px] font-mono text-[#788896] px-1',
          isOut ? 'justify-end' : 'justify-start'
        )}
      >
        <span>{message.timestamp}</span>
        {isOut && (
          <span>
            {message.status === 'read' ? (
              <CheckCheck className="w-3 h-3 text-sky-500" />
            ) : message.status === 'delivered' ? (
              <CheckCheck className="w-3 h-3 text-[#788896]" />
            ) : (
              <Check className="w-3 h-3 text-[#788896]" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
