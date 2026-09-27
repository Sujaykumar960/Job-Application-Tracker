import React from 'react';
import { ChatMessage } from '../../api/chatWebSocket';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOut = message.isOutgoing;

  return (
    <div
      className={cn(
        'flex flex-col space-y-0.5 max-w-[85%] sm:max-w-[70%]',
        isOut ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Bubble Container */}
      <div
        className={cn(
          'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-[13.5px] sm:text-sm leading-normal break-words whitespace-pre-wrap shadow-2xs',
          isOut
            ? 'bg-[#0A66C2] text-white rounded-tr-xs'
            : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs'
        )}
      >
        {/* Message Text */}
        <p className="leading-normal font-normal">{message.content}</p>

        {/* Optional Attachment Card */}
        {message.attachment && (
          <div
            className={cn(
              'mt-2.5 p-2.5 rounded-xl flex items-center justify-between gap-3 border font-mono text-[11px]',
              isOut
                ? 'bg-blue-800/50 border-white/20 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  isOut ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0A66C2]'
                )}
              >
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
                  [
                    `CareerX Secure Attachment\nFile: ${
                      message.attachment?.name || 'document.pdf'
                    }\nSize: ${message.attachment?.size || '1.0MB'}`,
                  ],
                  { type: 'text/plain' }
                );
                element.href = URL.createObjectURL(file);
                element.download = message.attachment?.name || 'attachment.txt';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className={cn(
                'p-1.5 rounded-lg transition-colors flex-shrink-0',
                isOut
                  ? 'hover:bg-white/20 text-white'
                  : 'hover:bg-slate-200/60 text-slate-600'
              )}
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Timestamp & Delivery Receipts */}
      <div
        className={cn(
          'flex items-center gap-1.5 text-[10px] font-mono text-slate-400 px-1',
          isOut ? 'justify-end' : 'justify-start'
        )}
      >
        <span>{message.timestamp}</span>
        {isOut && (
          <span>
            {message.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-[#0A66C2]" />
            ) : message.status === 'delivered' ? (
              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-slate-400" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
