// src/pages/dashboard/ManageEvents.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, Plus, Search, Edit3, Eye, Trash2,
  Upload, Rocket, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, X, ImageIcon,
} from 'lucide-react';
import { eventsApi } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTier {
  name: string;
  price: number | string;
  quantity: number | string;
  description: string;
  max_per_booking: number | string;
}

interface EventForm {
  title: string;
  description: string;
  category: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  total_capacity: string;
  is_free: boolean;
  tags: string;
  featured: boolean;
  ticket_tiers: TicketTier[];
}

interface Event {
  id: number;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  total_capacity?: number;
  available_seats?: number;
  is_free?: boolean;
  tags?: string | string[];
  featured?: boolean;
  cover_image?: string;
  ticket_types?: TicketTier[];
}

type ConfirmType = 'publish' | 'cancel' | 'delete';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'conference','concert','wedding','sports','training',
  'workshop','seminar','networking','exhibition','other',
];

const TICKET_NAMES = ['general','vip','early_bird','student','group'];

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-500/15 text-gray-400 border-gray-500/30',
  published: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const CONFIRM_META: Record<ConfirmType, { title: string; msg: string; btn: string; cls: string }> = {
  publish: {
    title: 'Publish Event?',
    msg:   'This event will become visible to all users immediately.',
    btn:   'Publish',
    cls:   'bg-green-500 hover:bg-green-600 text-white',
  },
  cancel: {
    title: 'Cancel Event?',
    msg:   'All confirmed bookings will be cancelled and attendees notified.',
    btn:   'Cancel Event',
    cls:   'bg-red-500 hover:bg-red-600 text-white',
  },
  delete: {
    title: 'Delete Event?',
    msg:   'This cannot be undone. Only events without confirmed bookings can be deleted.',
    btn:   'Delete',
    cls:   'bg-red-600 hover:bg-red-700 text-white',
  },
};

const PER_PAGE = 10;

const INPUT_CLS = `w-full px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

const defaultForm = (): EventForm => ({
  title: '', description: '', category: 'conference', status: 'draft',
  start_datetime: '', end_datetime: '', venue_name: '', venue_address: '',
  city: '', country: 'Rwanda', latitude: '', longitude: '',
  total_capacity: '', is_free: false, tags: '', featured: false,
  ticket_tiers: [{ name: 'general', price: '', quantity: '', description: '', max_per_booking: 10 }],
});

// ─── Small helpers ────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[status] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
      {status}
    </span>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'} border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin`} />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${value ? 'bg-[#b87333]' : 'bg-gray-400/20'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-6' : ''}`} />
    </button>
  );
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: '2-digit', year: 'numeric' });
}

// Convert tags from any shape (string or array) to display string
function tagsToString(tags?: string | string[]): string {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.join(', ');
  return tags;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManageEvents() {
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [events,      setEvents]      = useState<Event[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [confirm,     setConfirm]     = useState<Event | null>(null);
  const [confirmType, setConfirmType] = useState<ConfirmType>('delete');
  const [acting,      setActing]      = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editEvent,   setEditEvent]   = useState<Event | null>(null);
  const [form,        setForm]        = useState<EventForm>(defaultForm());
  const [tab,         setTab]         = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [coverTarget, setCoverTarget] = useState<Event | null>(null);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventsApi.list({ per_page: 100, ...(search && { search }) });
      const d   = res.data;
      setEvents(Array.isArray(d) ? d : d?.events ?? d?.items ?? []);
    } catch {
      setEvents([]);
      toast({ title: 'Failed to load events', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchEvents(); }, []);

  // ── Open create modal ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditEvent(null);
    setForm(defaultForm());
    setTab(0);
    setShowModal(true);
  };

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (e: Event) => {
    setEditEvent(e);
    setForm({
      title:          e.title           ?? '',
      description:    e.description     ?? '',
      category:       e.category        ?? 'conference',
      status:         e.status          ?? 'draft',
      start_datetime: e.start_datetime  ?? '',
      end_datetime:   e.end_datetime    ?? '',
      venue_name:     e.venue_name      ?? '',
      venue_address:  e.venue_address   ?? '',
      city:           e.city            ?? '',
      country:        e.country         ?? 'Rwanda',
      latitude:       e.latitude != null ? String(e.latitude) : '',
      longitude:      e.longitude != null ? String(e.longitude) : '',
      total_capacity: e.total_capacity != null ? String(e.total_capacity) : '',
      is_free:        e.is_free         ?? false,
      tags:           tagsToString(e.tags),
      featured:       e.featured        ?? false,
      ticket_tiers:   e.ticket_types?.length
        ? e.ticket_types
        : [{ name: 'general', price: '', quantity: '', description: '', max_per_booking: 10 }],
    });
    setTab(0);
    setShowModal(true);
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' }); return;
    }
    if (!form.start_datetime || !form.end_datetime) {
      toast({ title: 'Start and end date/time are required', variant: 'destructive' }); return;
    }
    if (!form.total_capacity) {
      toast({ title: 'Total capacity is required', variant: 'destructive' }); return;
    }
    if (form.ticket_tiers.length === 0) {
      toast({ title: 'At least one ticket tier is required', variant: 'destructive' }); return;
    }

    setSaving(true);
    const payload = {
      ...form,
      total_capacity: Number(form.total_capacity),
      latitude:       form.latitude  ? Number(form.latitude)  : undefined,
      longitude:      form.longitude ? Number(form.longitude) : undefined,
      tags:           form.tags,
      ticket_types:   form.ticket_tiers.map((t) => ({
        ...t,
        price:           Number(t.price)    || 0,
        quantity:        Number(t.quantity) || 0,
        max_per_booking: Number(t.max_per_booking) || 10,
      })),
    };

    try {
      if (editEvent) {
        await eventsApi.update(editEvent.id, payload as any);
        toast({ title: '✅ Event updated successfully' });
      } else {
        await eventsApi.create(payload as any);
        toast({ title: '✅ Event created successfully' });
      }
      setShowModal(false);
      fetchEvents();
    } catch (err: any) {
      toast({
        title: 'Failed to save event',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Publish / Cancel / Delete ─────────────────────────────────────────────
  const handleConfirmAction = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirmType === 'publish') await eventsApi.publish(confirm.id);
      else if (confirmType === 'cancel') await eventsApi.cancel(confirm.id);
      else if (confirmType === 'delete') await eventsApi.delete(confirm.id);

      toast({
        title: `Event ${confirmType === 'delete' ? 'deleted' : confirmType + 'ed'} successfully`,
      });
      fetchEvents();
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setActing(false);
      setConfirm(null);
    }
  };

  // ── Cover image upload ────────────────────────────────────────────────────
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coverTarget) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await eventsApi.uploadCover(coverTarget.id, fd);
      toast({ title: '✅ Cover image uploaded' });
      fetchEvents();
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setCoverTarget(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Ticket tier helpers ───────────────────────────────────────────────────
  const addTier    = () => setForm((f) => ({ ...f, ticket_tiers: [...f.ticket_tiers, { name: 'general', price: '', quantity: '', description: '', max_per_booking: 10 }] }));
  const removeTier = (i: number) => setForm((f) => ({ ...f, ticket_tiers: f.ticket_tiers.filter((_, j) => j !== i) }));
  const updateTier = (i: number, key: keyof TicketTier, val: string | number) =>
    setForm((f) => ({ ...f, ticket_tiers: f.ticket_tiers.map((t, j) => j === i ? { ...t, [key]: val } : t) }));

  // ── Client-side filter + pagination ──────────────────────────────────────
  const filtered   = events.filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#b87333]" /> Events
          </h1>
          <p className="text-sm text-[#9a8f82] mt-1">Create and manage your events</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
            placeholder="Search events…"
            className={`${INPUT_CLS} pl-9`}
          />
        </div>
        <button
          onClick={fetchEvents}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-medium hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Calendar className="w-12 h-12 text-[#b87333]/30" />
            <p className="text-base font-medium text-[#f5f0e8]">No events found</p>
            <button
              onClick={openCreate}
              className="px-4 py-2 text-sm text-white rounded-xl hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                  {['Cover','Title','Category','Status','Start Date','City','Capacity','Available','Featured','Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-medium text-[#9a8f82] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((e) => (
                  <tr key={e.id} className="border-b border-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.04)] transition-colors">
                    {/* Cover */}
                    <td className="py-3 px-3">
                      {e.cover_image ? (
                        <img src={e.cover_image} alt="" className="w-12 h-8 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-8 bg-[rgba(184,115,51,0.1)] rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-[#b87333]/40" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#f5f0e8] font-medium text-xs max-w-[160px] truncate">{e.title}</td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs capitalize">{e.category}</td>
                    <td className="py-3 px-3"><Badge status={e.status ?? 'draft'} /></td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs whitespace-nowrap">{formatDate(e.start_datetime)}</td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs">{e.city ?? '—'}</td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs">{e.total_capacity ?? '—'}</td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs">{e.available_seats ?? '—'}</td>
                    <td className="py-3 px-3 text-center text-xs">{e.featured ? '⭐' : '—'}</td>

                    {/* Actions */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#b87333] hover:bg-[rgba(184,115,51,0.1)] transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <a href={`/events/${e.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors" title="View Public Page">
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => { setCoverTarget(e); fileRef.current?.click(); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                          title="Upload Cover Image"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        {e.status === 'draft' && (
                          <button onClick={() => { setConfirm(e); setConfirmType('publish'); }} className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-colors" title="Publish">
                            <Rocket className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {e.status === 'published' && (
                          <button onClick={() => { setConfirm(e); setConfirmType('cancel'); }} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors" title="Cancel Event">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => { setConfirm(e); setConfirmType('delete'); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-[rgba(184,115,51,0.2)] text-[#9a8f82] disabled:opacity-40 hover:border-[#b87333] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[#9a8f82]">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-[rgba(184,115,51,0.2)] text-[#9a8f82] disabled:opacity-40 hover:border-[#b87333] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      {/* ── Create/Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#1e1e1e] rounded-2xl border border-[rgba(184,115,51,0.2)] w-full max-w-2xl shadow-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(184,115,51,0.15)]">
              <h3 className="font-bold text-[#f5f0e8] text-lg">
                {editEvent ? 'Edit Event' : 'Create Event'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-[#f5f0e8] p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-[rgba(184,115,51,0.15)]">
              {['Basic Info', 'Settings', 'Ticket Tiers'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                    tab === i
                      ? 'text-[#b87333] border-[#b87333]'
                      : 'text-[#9a8f82] border-transparent hover:text-[#f5f0e8]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* ── Tab 0: Basic Info ────────────────────────────────────── */}
              {tab === 0 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Title *</label>
                    <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={INPUT_CLS} placeholder="Event title" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} className={`${INPUT_CLS} resize-none`} placeholder="Describe your event…" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Category</label>
                      <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={INPUT_CLS}>
                        {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Status</label>
                      <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={INPUT_CLS}>
                        {['draft','published'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Start Date &amp; Time *</label>
                      <input type="datetime-local" value={form.start_datetime} onChange={(e) => setForm((f) => ({ ...f, start_datetime: e.target.value }))} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">End Date &amp; Time *</label>
                      <input type="datetime-local" value={form.end_datetime} onChange={(e) => setForm((f) => ({ ...f, end_datetime: e.target.value }))} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Venue Name</label>
                      <input value={form.venue_name} onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))} className={INPUT_CLS} placeholder="e.g. Kigali Arena" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">City</label>
                      <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={INPUT_CLS} placeholder="e.g. Kigali" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Venue Address</label>
                    <input value={form.venue_address} onChange={(e) => setForm((f) => ({ ...f, venue_address: e.target.value }))} className={INPUT_CLS} placeholder="Full address" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Country</label>
                      <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Latitude (opt)</label>
                      <input type="number" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} className={INPUT_CLS} placeholder="-1.9500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Longitude (opt)</label>
                      <input type="number" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} className={INPUT_CLS} placeholder="30.0588" />
                    </div>
                  </div>
                </>
              )}

              {/* ── Tab 1: Settings ──────────────────────────────────────── */}
              {tab === 1 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Total Capacity *</label>
                    <input type="number" min={1} value={form.total_capacity} onChange={(e) => setForm((f) => ({ ...f, total_capacity: e.target.value }))} className={INPUT_CLS} placeholder="e.g. 500" />
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 border rounded-xl border-[rgba(184,115,51,0.2)]">
                    <div>
                      <p className="text-sm font-medium text-[#f5f0e8]">Free Event</p>
                      <p className="text-xs text-[#9a8f82]">Ticket prices will be set to 0</p>
                    </div>
                    <Toggle value={form.is_free} onChange={() => setForm((f) => ({ ...f, is_free: !f.is_free }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Tags (comma-separated)</label>
                    <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={INPUT_CLS} placeholder="e.g. tech, kigali, startup" />
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 border rounded-xl border-[rgba(184,115,51,0.2)]">
                    <div>
                      <p className="text-sm font-medium text-[#f5f0e8]">Featured Event ⭐</p>
                      <p className="text-xs text-[#9a8f82]">Show in featured sections on homepage</p>
                    </div>
                    <Toggle value={form.featured} onChange={() => setForm((f) => ({ ...f, featured: !f.featured }))} />
                  </div>
                </>
              )}

              {/* ── Tab 2: Ticket Tiers ───────────────────────────────────── */}
              {tab === 2 && (
                <div className="space-y-3">
                  {form.ticket_tiers.map((tier, i) => (
                    <div key={i} className="p-4 border rounded-xl border-[rgba(184,115,51,0.2)] bg-black/20">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <div>
                          <label className="text-xs text-[#9a8f82] mb-1 block">Type</label>
                          <select value={tier.name} onChange={(e) => updateTier(i, 'name', e.target.value)} className={INPUT_CLS}>
                            {TICKET_NAMES.map((n) => (
                              <option key={n} value={n} className="capitalize">{n.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-[#9a8f82] mb-1 block">Price (RWF)</label>
                          <input
                            type="number" min={0}
                            value={tier.price}
                            onChange={(e) => updateTier(i, 'price', e.target.value)}
                            disabled={form.is_free}
                            className={`${INPUT_CLS} disabled:opacity-40 disabled:cursor-not-allowed`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#9a8f82] mb-1 block">Quantity</label>
                          <input type="number" min={1} value={tier.quantity} onChange={(e) => updateTier(i, 'quantity', e.target.value)} className={INPUT_CLS} placeholder="100" />
                        </div>
                        <div>
                          <label className="text-xs text-[#9a8f82] mb-1 block">Max/booking</label>
                          <input type="number" min={1} value={tier.max_per_booking} onChange={(e) => updateTier(i, 'max_per_booking', e.target.value)} className={INPUT_CLS} placeholder="10" />
                        </div>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-[#9a8f82] mb-1 block">Description</label>
                          <input value={tier.description} onChange={(e) => updateTier(i, 'description', e.target.value)} className={INPUT_CLS} placeholder="e.g. General admission, lunch included" />
                        </div>
                        {form.ticket_tiers.length > 1 && (
                          <button
                            onClick={() => removeTier(i)}
                            className="px-3 py-2.5 text-xs text-red-400 border border-red-400/30 rounded-xl hover:bg-red-400/10 transition-colors whitespace-nowrap"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addTier}
                    className="w-full py-2.5 text-sm border-2 border-dashed border-[rgba(184,115,51,0.3)] text-[#9a8f82] rounded-xl hover:border-[#b87333] hover:text-[#b87333] transition-colors"
                  >
                    + Add Ticket Tier
                  </button>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 p-5 border-t border-[rgba(184,115,51,0.15)]">
              <button
                onClick={() => tab > 0 ? setTab((t) => t - 1) : setShowModal(false)}
                className="flex-1 py-2.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] transition-colors"
              >
                {tab > 0 ? '← Back' : 'Cancel'}
              </button>
              {tab < 2 ? (
                <button
                  onClick={() => setTab((t) => t + 1)}
                  className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {saving ? <><Spinner small /> Saving…</> : editEvent ? 'Update Event' : 'Create Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ────────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-yellow-400" />
            </div>
            <h3 className="font-bold text-[#f5f0e8] mb-2 text-lg">
              {CONFIRM_META[confirmType].title}
            </h3>
            <p className="text-sm text-[#9a8f82] mb-1">
              <span className="font-semibold text-[#b87333]">{confirm.title}</span>
            </p>
            <p className="text-sm text-[#9a8f82] mb-5">
              {CONFIRM_META[confirmType].msg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={acting}
                className="flex-1 py-2.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] disabled:opacity-50 transition-colors"
              >
                Keep
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={acting}
                className={`flex-1 py-2.5 text-sm rounded-xl font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-2 ${CONFIRM_META[confirmType].cls}`}
              >
                {acting ? <Spinner small /> : CONFIRM_META[confirmType].btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
