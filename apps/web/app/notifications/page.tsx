'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckSquare, 
  Trash2, 
  ShieldAlert, 
  MailOpen, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page,
        limit: 15
      };

      if (filterType === 'UNREAD') {
        params.isRead = 'false';
      } else if (filterType === 'CRITICAL') {
        params.priority = 'CRITICAL';
      }

      const res = await api.get('/api/v1/notifications', { params });
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setTotal(res.data.data.meta.total || 0);
        setTotalPages(Math.ceil((res.data.data.meta.total || 0) / 15));
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch your notifications inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filterType]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/api/v1/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/v1/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getGroupTitle = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group notifications by date
  const groupedNotifications: { [key: string]: NotificationItem[] } = {};
  notifications.forEach((n) => {
    const key = getGroupTitle(n.createdAt);
    if (!groupedNotifications[key]) {
      groupedNotifications[key] = [];
    }
    groupedNotifications[key].push(n);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-150';
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-150';
      case 'NORMAL':
        return 'text-teal-700 bg-teal-50 border-teal-150';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-150';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 font-semibold text-xs text-slate-700">
        
        {/* Header Block */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <Bell className="h-7 w-7 text-teal-600" />
              Notifications Inbox
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 font-semibold">Manage your system operational alerts, appointment reminders, and critical announcements.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/settings/notifications')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Preferences
            </button>
            <button
              onClick={handleMarkAllRead}
              className="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckSquare className="h-4 w-4" />
              Mark all read
            </button>
          </div>
        </div>

        {error && <div className="p-4.5 bg-red-50 border border-red-150 text-red-805 rounded-xl font-bold">{error}</div>}

        {/* Filters and List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Toggles */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-50 p-1 border border-slate-200 rounded-xl">
              {[
                { type: 'ALL', label: 'All Alerts' },
                { type: 'UNREAD', label: 'Unread Only' },
                { type: 'CRITICAL', label: 'Critical' }
              ].map(tab => (
                <button
                  key={tab.type}
                  onClick={() => {
                    setFilterType(tab.type as any);
                    setPage(1);
                  }}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer',
                    filterType === tab.type 
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-150' 
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{total} total alerts</span>
          </div>

          {/* Inbox List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Fetching notifications inbox...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-20 text-slate-400 italic font-semibold text-xs bg-slate-50/50">
              No notifications matching this filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(groupedNotifications).map(([groupTitle, list]) => (
                <div key={groupTitle} className="space-y-0.5">
                  
                  {/* Date section header */}
                  <div className="bg-slate-50/50 px-6 py-2.5 border-y border-slate-100 text-[10px] text-slate-450 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {groupTitle}
                  </div>

                  <div className="divide-y divide-slate-100/60">
                    {list.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          "px-6 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition relative border-l-4",
                          n.isRead ? "border-l-transparent hover:bg-slate-55/30" : "border-l-teal-600 bg-teal-50/15 hover:bg-teal-50/25",
                          n.priority === 'CRITICAL' && !n.isRead ? "border-l-red-600 bg-red-50/5 hover:bg-red-50/10" : ""
                        )}
                      >
                        <div className="flex gap-4.5">
                          {/* Priority dot / icon */}
                          {n.priority === 'CRITICAL' ? (
                            <div className="h-8.5 w-8.5 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0 border border-red-100 shadow-sm animate-pulse">
                              <ShieldAlert className="h-4.5 w-4.5" />
                            </div>
                          ) : (
                            <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", n.isRead ? "bg-slate-300" : "bg-teal-500")} />
                          )}

                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border', getPriorityColor(n.priority))}>
                                {n.priority}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h3 className="text-slate-800 font-extrabold text-sm leading-snug">{n.title}</h3>
                            <p className="text-slate-550 leading-relaxed font-semibold">{n.body}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3.5">
                          {n.actionUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(n.id);
                                router.push(n.actionUrl!);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Source
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(n.id, e)}
                            className="p-2 border border-slate-200/80 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-300 hidden sm:block" />
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-[10.5px] text-slate-450 uppercase font-extrabold">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}

        </div>

      </div>
    </DashboardLayout>
  );
}
