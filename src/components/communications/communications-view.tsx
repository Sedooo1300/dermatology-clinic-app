'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell, CalendarCheck, CheckCircle, FileText, Wallet, Heart,
  TestTubes, Sparkles, Gift, Star, Send, Clock, MessageCircle,
  Search, X, ExternalLink, CalendarDays, Phone, User,
  Bot, ChevronDown, Calendar, Play, Trash2, CheckCheck,
  RefreshCw, MessageSquare, Zap, ArrowLeft, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface Template {
  id: string
  label: string
  icon: string
  content: string
}

interface Message {
  id: string
  patientId: string | null
  content: string
  type: string
  status: string
  scheduledAt: string | null
  sentAt: string | null
  waLink: string | null
  createdAt: string
  patient: { id: string; name: string; phone: string } | null
}

interface Patient {
  id: string
  name: string
  phone: string | null
}

interface SessionType {
  id: string
  name: string
  price: number
  isActive: boolean
}

interface TimeSlot {
  time: string
  isAvailable: boolean
  bookedCount: number
}

interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  content: string
  timestamp: Date
}

// ═══════════════════════════════════════
// Icon Mapping
// ═══════════════════════════════════════

const ICON_MAP: Record<string, typeof Bell> = {
  Bell, CalendarCheck, CheckCircle, FileText, Wallet, Heart,
  TestTubes, Sparkles, Gift, Star,
}

function getTemplateIcon(iconName: string) {
  return ICON_MAP[iconName] || MessageSquare
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function CommunicationsView() {
  const [activeTab, setActiveTab] = useState('whatsapp')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">مركز التواصل</h1>
            <p className="text-xs text-muted-foreground">إدارة رسائل واتساب والروبوت الذكي</p>
          </div>
        </div>
        <Badge className="bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 gap-1">
          <Zap className="w-3 h-3" />
          WhatsApp
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm">
            <MessageCircle className="w-3.5 h-3.5" />
            رسائل واتساب
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5 text-xs sm:text-sm">
            <CalendarDays className="w-3.5 h-3.5" />
            تذكيرات مجدولة
          </TabsTrigger>
          <TabsTrigger value="bot" className="gap-1.5 text-xs sm:text-sm">
            <Bot className="w-3.5 h-3.5" />
            روبوت الحجز
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <ScheduledTab />
        </TabsContent>

        <TabsContent value="bot" className="mt-4">
          <BotTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════
// WhatsApp Tab
// ═══════════════════════════════════════

function WhatsAppTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [customPhone, setCustomPhone] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [recentMessages, setRecentMessages] = useState<Message[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const [tplRes, patRes, msgRes] = await Promise.all([
        fetch('/api/communications/templates').then(r => r.json()),
        fetch('/api/patients?limit=500').then(r => r.json()),
        fetch('/api/communications/messages').then(r => r.json()),
      ])
      setTemplates(tplRes?.templates || [])
      setPatients(patRes?.patients || [])
      setRecentMessages(msgRes?.messages || [])
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredPatients = patients.filter(p =>
    p.name.includes(patientSearch) || (p.phone && p.phone.includes(patientSearch))
  ).slice(0, 10)

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl)
    let content = tpl.content
    if (selectedPatient) {
      content = content.replace(/\{patientName\}/g, selectedPatient.name)
    }
    setMessageContent(content)
    setShowPreview(true)
  }

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setCustomPhone(patient.phone || '')
    setPatientSearch('')
    setShowPatientDropdown(false)
    if (selectedTemplate) {
      const content = selectedTemplate.content.replace(/\{patientName\}/g, patient.name)
      setMessageContent(content)
    }
  }

  const handleSend = async () => {
    const phone = customPhone || selectedPatient?.phone
    if (!phone) {
      toast.error('يرجى اختيار المريض أو إدخال رقم التليفون')
      return
    }
    if (!messageContent.trim()) {
      toast.error('يرجى كتابة محتوى الرسالة')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.id || null,
          templateId: selectedTemplate?.id || null,
          phone,
          content: messageContent,
        }),
      })
      const data = await res.json()
      if (data.waLink) {
        window.open(data.waLink, '_blank')
        toast.success('تم فتح واتساب بنجاح')
        setSelectedTemplate(null)
        setMessageContent('')
        setShowPreview(false)
        fetchData()
      } else {
        toast.error(data.error || 'خطأ في إرسال الرسالة')
      }
    } catch {
      toast.error('خطأ في إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  const handleSchedule = async () => {
    const phone = customPhone || selectedPatient?.phone
    if (!phone || !messageContent.trim()) {
      toast.error('يرجى اختيار المريض وكتابة الرسالة')
      return
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)

    setSending(true)
    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.id || null,
          templateId: selectedTemplate?.id || null,
          phone,
          content: messageContent,
          scheduledAt: tomorrow.toISOString(),
        }),
      })
      const data = await res.json()
      if (data.messageId) {
        toast.success('تم جدولة الرسالة بنجاح')
        setSelectedTemplate(null)
        setMessageContent('')
        setShowPreview(false)
        fetchData()
      } else {
        toast.error(data.error || 'خطأ في جدولة الرسالة')
      }
    } catch {
      toast.error('خطأ في جدولة الرسالة')
    } finally {
      setSending(false)
    }
  }

  // Highlight template variables
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{[^}]+\})/)
    return parts.map((part, i) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return (
          <span key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 rounded font-mono text-sm">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Patient Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-[#25D366]" />
            اختيار المريض
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو رقم التليفون..."
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true) }}
                onFocus={() => setShowPatientDropdown(true)}
                className="pr-9"
              />
              {selectedPatient && (
                <button
                  onClick={() => { setSelectedPatient(null); setCustomPhone('') }}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {showPatientDropdown && !selectedPatient && filteredPatients.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 right-0 left-0 bg-card border border-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                {filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-right px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.phone || 'بدون رقم'}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {selectedPatient && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-[#25D366]/5 rounded-xl border border-[#25D366]/20"
              >
                <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-[#25D366]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedPatient.phone}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Custom phone input */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">أو أدخل رقم التليفون مباشرة</p>
            <Input
              placeholder="01xxxxxxxxx"
              value={customPhone}
              onChange={e => setCustomPhone(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            اختر قالب الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {templates.map((tpl) => {
              const IconComp = getTemplateIcon(tpl.icon)
              const isSelected = selectedTemplate?.id === tpl.id
              return (
                <motion.button
                  key={tpl.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center',
                    isSelected
                      ? 'border-[#25D366] bg-[#25D366]/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isSelected ? 'bg-[#25D366] text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium leading-tight">{tpl.label}</span>
                </motion.button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Message Preview / Editor */}
      <AnimatePresence>
        {(showPreview || messageContent) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-[#25D366]/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#25D366]" />
                    معاينة الرسالة
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowPreview(false); setMessageContent(''); setSelectedTemplate(null) }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-[#ECE5DD] dark:bg-[#1a2726] rounded-xl p-4">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed" dir="rtl">
                    {highlightVariables(messageContent)}
                  </pre>
                </div>
                <Textarea
                  value={messageContent}
                  onChange={e => setMessageContent(e.target.value)}
                  rows={6}
                  className="text-sm"
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSend}
                    disabled={sending || !messageContent.trim()}
                    className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال عبر واتساب
                  </Button>
                  <Button
                    onClick={handleSchedule}
                    disabled={sending || !messageContent.trim()}
                    variant="outline"
                    className="gap-2"
                  >
                    <CalendarDays className="w-4 h-4" />
                    جدولة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Messages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#25D366]" />
              آخر الرسائل
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1 text-xs">
              <RefreshCw className="w-3 h-3" />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentMessages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {msg.patient?.name || 'بدون مريض'}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        msg.status === 'sent' ? 'text-emerald-600 border-emerald-300' : 'text-amber-600 border-amber-300'
                      )}>
                        {msg.status === 'sent' ? 'تم الإرسال' : 'مجدول'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  {msg.waLink && msg.status === 'sent' && (
                    <a href={msg.waLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5 text-[#25D366]" />
                      </Button>
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════
// Scheduled Tab
// ═══════════════════════════════════════

function ScheduledTab() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/communications/messages?status=scheduled')
      const data = await res.json()
      setMessages(data?.messages || [])
    } catch {
      toast.error('خطأ في جلب الرسائل المجدولة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const filteredMessages = messages.filter(m => {
    if (!filterDate) return true
    if (!m.scheduledAt) return false
    return m.scheduledAt.startsWith(filterDate)
  })

  const handleSendNow = async (msg: Message) => {
    if (!msg.waLink) return
    window.open(msg.waLink, '_blank')
    try {
      await fetch('/api/communications/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, status: 'sent' }),
      })
      toast.success('تم إرسال الرسالة')
      fetchMessages()
    } catch {
      toast.error('خطأ في تحديث حالة الرسالة')
    }
  }

  const handleCancel = async (msg: Message) => {
    try {
      await fetch('/api/communications/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, status: 'cancelled' }),
      })
      toast.success('تم إلغاء الرسالة')
      fetchMessages()
    } catch {
      toast.error('خطأ في إلغاء الرسالة')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="max-w-[200px]"
            />
            {filterDate && (
              <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1" />
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="w-3 h-3" />
              {filteredMessages.length} رسالة
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">لا توجد رسائل مجدولة</p>
            <p className="text-xs text-muted-foreground">الرسائل المجدولة ستظهر هنا</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {msg.patient?.name || 'بدون مريض'}
                        </span>
                        {msg.patient?.phone && (
                          <span className="text-xs text-muted-foreground" dir="ltr">{msg.patient.phone}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{msg.content}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {msg.scheduledAt ? new Date(msg.scheduledAt).toLocaleString('ar-EG') : '—'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10"
                        onClick={() => handleSendNow(msg)}
                      >
                        <Play className="w-3 h-3" />
                        إرسال
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-red-500"
                        onClick={() => handleCancel(msg)}
                      >
                        <Trash2 className="w-3 h-3" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// Bot Tab
// ═══════════════════════════════════════

function BotTab() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [botStep, setBotStep] = useState<'init' | 'ask_name' | 'ask_phone' | 'ask_session' | 'ask_date' | 'ask_time' | 'done'>('init')
  const [bookingData, setBookingData] = useState({
    name: '',
    phone: '',
    sessionTypeId: '',
    date: '',
    time: '',
  })
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/session-types?limit=100')
      .then(r => r.json())
      .then(data => setSessionTypes((data?.sessionTypes || []).filter((s: SessionType) => s.isActive)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const addBotMessage = (content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'bot',
      content,
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, msg])
  }

  const addUserMessage = (content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, msg])
  }

  const startBot = () => {
    setChatMessages([])
    setBotStep('ask_name')
    setBookingData({ name: '', phone: '', sessionTypeId: '', date: '', time: '' })
    setAvailableSlots([])
    setSelectedDate('')
    setTimeout(() => {
      addBotMessage('مرحباً بك في عيادة المغازى 🏥\nأنا روبوت الحجز الذكي، سأساعدك في حجز موعدك.\n\nما اسمك؟ 👤')
    }, 500)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMsg = inputValue.trim()
    setInputValue('')
    addUserMessage(userMsg)
    setIsProcessing(true)

    try {
      switch (botStep) {
        case 'ask_name': {
          setBookingData(prev => ({ ...prev, name: userMsg }))
          setBotStep('ask_phone')
          setTimeout(() => {
            addBotMessage(`أهلاً ${userMsg} 👋\n\nما رقم تليفونك؟ 📱`)
          }, 600)
          break
        }

        case 'ask_phone': {
          // Basic phone validation
          const cleaned = userMsg.replace(/[\s\-\+]/g, '')
          if (cleaned.length < 10) {
            addBotMessage('❌ رقم التليفون غير صحيح. يرجى إدخال رقم مكون من 11 رقم على الأقل.')
            break
          }
          setBookingData(prev => ({ ...prev, phone: cleaned }))
          setBotStep('ask_session')

          if (sessionTypes.length > 0) {
            const sessionList = sessionTypes.slice(0, 8).map((s, i) => `${i + 1}. ${s.name} - ${s.price} ج.م`).join('\n')
            setTimeout(() => {
              addBotMessage(`عايز تحجز جلسة إيه؟ 📋\n\n${sessionList}\n\nاكتب رقم الجلسة أو اسمها`)
            }, 600)
          } else {
            setBotStep('ask_date')
            setTimeout(() => {
              addBotMessage('اختار اليوم اللي عايز تحجز فيه 📅\n\nاكتب التاريخ بصيغة YYYY-MM-DD\nمثال: 2025-01-15\n\nأو اكتب "بكره" للموعد الغد')
            }, 600)
          }
          break
        }

        case 'ask_session': {
          const sessionMatch = sessionTypes.find(s =>
            s.name.includes(userMsg) ||
            sessionTypes.indexOf(s) + 1 === parseInt(userMsg)
          )
          if (sessionMatch) {
            setBookingData(prev => ({ ...prev, sessionTypeId: sessionMatch.id }))
            setBotStep('ask_date')
            setTimeout(() => {
              addBotMessage(`تم اختيار: ${sessionMatch.name} (${sessionMatch.price} ج.م) ✅\n\nاختار اليوم اللي عايز تحجز فيه 📅\n\nاكتب التاريخ بصيغة YYYY-MM-DD\nمثال: ${new Date().toISOString().split('T')[0]}\n\nأو اكتب "بكره" للموعد الغد`)
            }, 600)
          } else {
            addBotMessage('❌ الجلسة غير موجودة. يرجى اختيار جلسة من القائمة.')
          }
          break
        }

        case 'ask_date': {
          let dateStr = ''
          if (userMsg.includes('بكره') || userMsg.includes('غدا')) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            dateStr = tomorrow.toISOString().split('T')[0]
          } else {
            // Try to parse date
            const parsed = new Date(userMsg)
            if (!isNaN(parsed.getTime())) {
              dateStr = parsed.toISOString().split('T')[0]
            }
          }

          if (!dateStr) {
            addBotMessage('❌ التاريخ غير صحيح. يرجى إدخال التاريخ بصيغة YYYY-MM-DD\nمثال: 2025-01-15')
            break
          }

          setSelectedDate(dateStr)
          setBookingData(prev => ({ ...prev, date: dateStr }))

          // Fetch available slots
          try {
            const res = await fetch(`/api/communications/bot/availability?date=${dateStr}`)
            const data = await res.json()
            setAvailableSlots(data?.slots || [])
            setBotStep('ask_time')

            const availableSlots = (data?.slots || []).filter((s: TimeSlot) => s.isAvailable)
            if (availableSlots.length === 0) {
              addBotMessage(`عذراً، لا توجد مواعيد متاحة يوم ${dateStr} 📅\n\nيرجى اختيار يوم آخر.`)
              setBotStep('ask_date')
            } else {
              const slotList = availableSlots.map((s: TimeSlot) => `🕐 ${s.time}`).join('\n')
              setTimeout(() => {
                addBotMessage(`المواعيد المتاحة يوم ${dateStr}: 📅\n\n${slotList}\n\nاختار الوقت المناسب لك`)
              }, 600)
            }
          } catch {
            addBotMessage('❌ خطأ في جلب المواعيد. يرجى المحاولة مرة أخرى.')
          }
          break
        }

        case 'ask_time': {
          const slot = availableSlots.find(s => s.time === userMsg || s.time.startsWith(userMsg))
          if (!slot || !slot.isAvailable) {
            addBotMessage('❌ هذا الوقت غير متاح. يرجى اختيار وقت من القائمة.')
            break
          }

          setBookingData(prev => ({ ...prev, time: slot.time }))
          setBotStep('done')
          setIsProcessing(true)

          try {
            const res = await fetch('/api/communications/bot/book', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientPhone: bookingData.phone,
                patientName: bookingData.name,
                sessionTypeId: bookingData.sessionTypeId || undefined,
                date: bookingData.date,
                time: slot.time,
              }),
            })
            const data = await res.json()

            if (data.success) {
              const sessionName = data.booking?.sessionType || 'كشف'
              setTimeout(() => {
                addBotMessage(`تم الحجز بنجاح ✅🎉\n\n📋 تفاصيل الحجز:\n━━━━━━━━━━━━━━━\n👤 الاسم: ${bookingData.name}\n🔬 الجلسة: ${sessionName}\n📅 التاريخ: ${bookingData.date}\n🕐 الوقت: ${slot.time}\n${data.booking?.price ? `💰 السعر: ${data.booking.price} ج.م` : ''}\n━━━━━━━━━━━━━━━\n\nنتطلع لرؤيتك في عيادة المغازى 🏥\n\nللحجز مرة أخرى اضغط على زر "بدء محادثة جديدة"`)
              }, 600)
            } else {
              addBotMessage(`❌ ${data.error || 'خطأ في الحجز'}\n\nيرجى المحاولة مرة أخرى.`)
              setBotStep('ask_date')
            }
          } catch {
            addBotMessage('❌ خطأ في الحجز. يرجى المحاولة مرة أخرى.')
            setBotStep('ask_date')
          }
          break
        }

        case 'done': {
          addBotMessage('تم الحجز بالفعل ✅\n\nللحجز مرة أخرى اضغط على زر "بدء محادثة جديدة"')
          break
        }
      }
    } catch {
      addBotMessage('❌ حدث خطأ. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Chat Container */}
      <Card className="overflow-hidden">
        {/* Chat Header */}
        <div className="bg-[#25D366] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">روبوت حجز المغازى</p>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/70 inline-block" />
              متصل الآن
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-1"
            onClick={startBot}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">جديد</span>
          </Button>
        </div>

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className="bg-[#ECE5DD] dark:bg-[#1a2726] min-h-[400px] max-h-[500px] overflow-y-auto p-4 space-y-3"
        >
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-[#25D366]" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">روبوت الحجز الذكي</p>
              <p className="text-xs text-muted-foreground mb-4">احجز موعدك بسهولة وسرعة</p>
              <Button
                onClick={startBot}
                className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                بدء محادثة جديدة
              </Button>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn('flex', msg.role === 'bot' ? 'justify-start' : 'justify-end')}
                  >
                    <div className={cn(
                      'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                      msg.role === 'bot'
                        ? 'bg-white dark:bg-gray-800 rounded-tl-sm'
                        : 'bg-[#DCF8C6] dark:bg-[#1a3a2a] rounded-tr-sm'
                    )}>
                      {msg.role === 'bot' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3 h-3 text-[#25D366]" />
                          <span className="text-[10px] text-[#25D366] font-medium">روبوت المغازى</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
                        {msg.content}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 text-left" dir="ltr">
                        {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        {chatMessages.length > 0 && botStep !== 'done' && (
          <div className="bg-white dark:bg-card border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                placeholder={botStep === 'ask_name' ? 'اكتب اسمك...' : botStep === 'ask_phone' ? 'اكتب رقم تليفونك...' : 'اكتب ردك...'}
                disabled={isProcessing}
                className="flex-1"
                dir="rtl"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-[#25D366] hover:bg-[#20BD5A] text-white shrink-0"
                size="icon"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {botStep === 'done' && (
          <div className="bg-white dark:bg-card border-t border-border p-3">
            <Button
              onClick={startBot}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              بدء محادثة جديدة
            </Button>
          </div>
        )}
      </Card>

      {/* Available Slots Preview */}
      {botStep === 'ask_time' && availableSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#25D366]" />
                المواعيد المتاحة - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => { setInputValue(slot.time) }}
                    disabled={!slot.isAvailable}
                    className={cn(
                      'py-2 px-1 rounded-lg text-xs font-medium text-center transition-all',
                      slot.isAvailable
                        ? 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 cursor-pointer'
                        : 'bg-muted text-muted-foreground line-through cursor-not-allowed'
                    )}
                  >
                    {slot.time}
                    {slot.bookedCount > 0 && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        {slot.bookedCount}/2
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Session Types Preview for Bot */}
      {botStep === 'ask_session' && sessionTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#25D366]" />
                أنواع الجلسات المتاحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sessionTypes.slice(0, 9).map((st, i) => (
                  <button
                    key={st.id}
                    onClick={() => { setInputValue(String(i + 1)) }}
                    className="p-3 rounded-xl bg-muted/50 hover:bg-muted text-right transition-colors border border-transparent hover:border-[#25D366]/20"
                  >
                    <p className="text-xs font-medium mb-0.5">{st.name}</p>
                    <p className="text-[10px] text-muted-foreground">{st.price} ج.م</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
