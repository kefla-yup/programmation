import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MessageService {
  message: string | null = null;
  messageType: 'success' | 'error' = 'success';
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, type: 'success' | 'error' = 'success'): void {
    this.message = msg;
    this.messageType = type;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.message = null;
    }, 4000);
  }

  clear(): void {
    this.message = null;
  }
}
