'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShieldAlert, Check, CheckSquare, Trash2, ExternalLink } from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  eventType: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef(0);

  const fetchCountAndLatest = async () => {
    try {
      const res = await api.get('/api/v1/notifications', {
        params: { limit: 10 }
      });
      const data = res.data?.data;
      const newList: NotificationItem[] = data?.notifications || [];
      const newCount = data?.meta?.unreadCount || 0;

      setNotifications(newList);
      setUnreadCount(newCount);

      // Trigger audio & toast warning for new high/critical alarms
      if (newCount > prevUnreadCountRef.current) {
        const newlyAdded = newList.filter(n => !n.isRead);
        const hasNewCritical = newlyAdded.some(n => n.priority === 'CRITICAL');
        const hasNewHigh = newlyAdded.some(n => n.priority === 'HIGH');

        if (hasNewCritical) {
          playAlertSound();
          showNotificationToast("🚨 CRITICAL EMERGENCY", newlyAdded.find(n => n.priority === 'CRITICAL')?.body || "Immediate action required.");
        } else if (hasNewHigh) {
          showNotificationToast("⚠️ High Priority Alert", newlyAdded.find(n => n.priority === 'HIGH')?.body || "Important update received.");
        }
      }
      prevUnreadCountRef.current = newCount;

    } catch (err) {
      console.error('Failed to sync notifications:', err);
    }
  };

  useEffect(() => {
    fetchCountAndLatest();
    // Short polling every 15 seconds
    const interval = setInterval(fetchCountAndLatest, 15000);

    // Click outside handler to close dropdown
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Synthesize critical beep alarm using Web Audio API
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Dual-tone siren synthesis
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playBeep(880, now, 0.25);
      playBeep(987, now + 0.3, 0.25);
    } catch (err) {
      console.warn('Could not synthesize web audio alarm beep:', err);
    }
  };

  // Trigger HTML5 desktop notification if granted
  const showNotificationToast = (title: string, body: string) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    setIsOpen(false);
    if (!n.isRead) {
      try {
        await api.patch(`/api/v1/notifications/${n.id}/read`);
        fetchCountAndLatest();
      } catch (err) {
        console.error(err);
      }
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/v1/notifications/read-all');
      fetchCountAndLatest();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-650 bg-red-50 border-red-100';
      case 'HIGH':
        return 'text-orange-650 bg-orange-50 border-orange-100';
      case 'NORMAL':
        return 'text-teal-650 bg-teal-50 border-teal-100';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="relative font-semibold text-xs text-slate-700" ref={dropdownRef}>
      
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center text-[9px] font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="font-extrabold text-slate-800 text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 font-extrabold cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">
                No notifications found
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-4 flex gap-3 hover:bg-slate-50/60 cursor-pointer transition relative border-l-4",
                    n.isRead ? "border-l-transparent" : "border-l-teal-600 bg-teal-50/10",
                    n.priority === 'CRITICAL' && !n.isRead ? "border-l-red-650 bg-red-50/5" : ""
                  )}
                >
                  {n.priority === 'CRITICAL' ? (
                    <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-200">
                      <ShieldAlert className="h-4.5 w-4.5 animate-bounce" />
                    </div>
                  ) : (
                    <span className={cn('h-2 w-2 rounded-full mt-2 shrink-0', n.isRead ? 'bg-slate-300' : 'bg-teal-500 animate-ping')} />
                  )}

                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-extrabold border", getPriorityColor(n.priority))}>
                        {n.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{n.title}</h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">{n.body}</p>
                  </div>

                  {n.actionUrl && (
                    <ExternalLink className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="text-[10px] text-slate-650 hover:text-slate-900 font-extrabold block w-full text-center py-1 cursor-pointer"
            >
              View All Inbox
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
