import { createClient } from '@supabase/supabase-js';
import { Project, PlanItem, Event, ContactPerson } from '../types';

// These are your public Supabase keys.
// Security is handled by Supabase Row Level Security (RLS) policies.
const supabaseUrl = 'https://bwwyovaeqnfqqxjmfkir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d3lvdmFlcW5mcXF4am1ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTU0NTUsImV4cCI6MjA3NDczMTQ1NX0.4Uav7prtONWCIYVEzxlc29f4mkJZJtuVC9gkMmjnYqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const formatPhoneNumberForLink = (phone: string | undefined): string => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
        digits = '7' + digits.substring(1);
    }
    if (digits.length > 0 && !digits.startsWith('+')) {
        return `+${digits}`;
    }
    return `+${digits.replace('+', '')}`;
};

export const sendGuestEventNotification = async (project: Project, task: PlanItem, event: Event, baseUrl: string) => {
  try {
    // 1. Fetch auditor's profile to get Telegram credentials
    const { data: auditorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', project.user_id)
      .single();
  
    if (profileError || !auditorProfile || !auditorProfile.telegram_bot_token || !auditorProfile.telegram_chat_id) {
      console.warn('Could not send Telegram notification: Auditor profile or credentials not found.');
      return; // Fail silently without blocking UI
    }

    // 2. Fetch company profile for priority contact
    const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('contacts')
        .eq('project_id', project.id)
        .single();
    
    const priorityContact = companyProfile?.contacts?.find((c: ContactPerson) => c.priority_contact_method);


    // 3. Construct inline keyboard
    const inline_keyboard = [];
    
    // Button 1: Go to comment
    const commentUrl = `${baseUrl}#/${project.id}?taskId=${task.id}`;
    inline_keyboard.push([{ text: 'Перейти к комментарию', url: commentUrl }]);

    // Button 2: Priority contact based on preferred method
    if (priorityContact) {
      let priorityUrl = '';
      let priorityText = '';
      const method = priorityContact.priority_contact_method;

      if (method === 'telegram' && priorityContact.phone) {
          const formattedPhone = formatPhoneNumberForLink(priorityContact.phone);
          if (formattedPhone) {
            priorityUrl = `https://t.me/${formattedPhone}`;
            priorityText = `Связаться (Telegram)`;
          }
      } else if (method === 'whatsapp' && (priorityContact.whatsapp || priorityContact.phone)) {
          const formattedWhatsapp = formatPhoneNumberForLink(priorityContact.whatsapp || priorityContact.phone);
          if (formattedWhatsapp) {
            priorityUrl = `https://wa.me/${formattedWhatsapp}`;
            priorityText = `Связаться (WhatsApp)`;
          }
      } else if (method === 'email' && priorityContact.email) {
          priorityUrl = `mailto:${priorityContact.email}`;
          priorityText = `Связаться (Email)`;
      } else if (method === 'phone' && priorityContact.phone) {
          priorityUrl = `tel:${priorityContact.phone}`;
          priorityText = `Связаться (Телефон)`;
      }

      if (priorityUrl) {
          inline_keyboard.push([{ text: `${priorityText}: ${priorityContact.name}`, url: priorityUrl }]);
      }
    }

    // 4. Format the message
    const eventTypeName = event.type === 'meeting' ? 'Запрос на встречу' : 'Комментарий';
    const message = `
*${eventTypeName} в проекте "${project.name}"*

*От:* ${event.author_email}
*Задача:* ${task.title}

*Сообщение:*
${event.content}
    `;

    // 5. Send the message via Telegram Bot API
    const { telegram_bot_token, telegram_chat_id } = auditorProfile;
    const url = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message.trim(),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inline_keyboard
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    console.log('Telegram notification sent successfully.');

  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
};