import { useState, KeyboardEvent, useRef } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MultiEmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  existingEmails?: string[];
  pendingInvites?: string[];
  disabled?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEPARATORS = [',', ';', ' ', '\t'];

export function MultiEmailInput({
  emails,
  onChange,
  placeholder = 'Digite email e pressione Enter...',
  existingEmails = [],
  pendingInvites = [],
  disabled = false,
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeEmail = (email: string) => email.toLowerCase().trim();

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email);

  const isExistingMember = (email: string) => 
    existingEmails.map(e => e.toLowerCase()).includes(normalizeEmail(email));

  const isPendingInvite = (email: string) => 
    pendingInvites.map(e => e.toLowerCase()).includes(normalizeEmail(email));

  const isDuplicate = (email: string) => 
    emails.map(e => e.toLowerCase()).includes(normalizeEmail(email));

  const getEmailStatus = (email: string): 'valid' | 'invalid' | 'existing' | 'pending' | 'duplicate' => {
    if (!isValidEmail(email)) return 'invalid';
    if (isDuplicate(email)) return 'duplicate';
    if (isExistingMember(email)) return 'existing';
    if (isPendingInvite(email)) return 'pending';
    return 'valid';
  };

  const addEmails = (value: string) => {
    // Split by common separators
    const parts = value.split(new RegExp(`[${SEPARATORS.map(s => s === ' ' ? '\\s' : s).join('')}]+`));
    const newEmails: string[] = [];

    for (const part of parts) {
      const email = normalizeEmail(part);
      if (!email) continue;
      
      // Only add valid, non-duplicate emails
      if (isValidEmail(email) && !isDuplicate(email) && !newEmails.includes(email)) {
        newEmails.push(email);
      }
    }

    if (newEmails.length > 0) {
      onChange([...emails, ...newEmails]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const value = inputValue.trim();

    // Handle Enter, Tab, comma, semicolon
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (value) {
        addEmails(value);
        setInputValue('');
      }
    }

    // Handle Backspace when input is empty
    if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addEmails(pastedText);
    setInputValue('');
  };

  const handleBlur = () => {
    const value = inputValue.trim();
    if (value) {
      addEmails(value);
      setInputValue('');
    }
  };

  const removeEmail = (index: number) => {
    onChange(emails.filter((_, i) => i !== index));
  };

  const getBadgeVariant = (email: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    const status = getEmailStatus(email);
    switch (status) {
      case 'invalid':
        return 'destructive';
      case 'existing':
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTooltipMessage = (email: string): string | null => {
    const status = getEmailStatus(email);
    switch (status) {
      case 'invalid':
        return 'Email inválido';
      case 'existing':
        return 'Já é membro da equipe';
      case 'pending':
        return 'Já tem convite pendente';
      default:
        return null;
    }
  };

  const validEmails = emails.filter(e => getEmailStatus(e) === 'valid');
  const invalidEmails = emails.filter(e => getEmailStatus(e) !== 'valid');

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[80px] cursor-text',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email, index) => {
          const tooltip = getTooltipMessage(email);
          return (
            <Badge
              key={`${email}-${index}`}
              variant={getBadgeVariant(email)}
              className="flex items-center gap-1 px-2 py-1 text-sm"
              title={tooltip || undefined}
            >
              <span className="max-w-[200px] truncate">{email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEmail(index);
                  }}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={emails.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Separe múltiplos emails por vírgula, ponto e vírgula ou pressione Enter
      </p>
      {emails.length > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            {validEmails.length} email{validEmails.length !== 1 ? 's' : ''} válido{validEmails.length !== 1 ? 's' : ''}
          </span>
          {invalidEmails.length > 0 && (
            <span className="text-destructive">
              {invalidEmails.length} com problema{invalidEmails.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
