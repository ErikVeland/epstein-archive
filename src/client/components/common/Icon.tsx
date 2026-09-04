import React from 'react';
import type { CSSProperties } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Bookmark,
  Book,
  BookOpen,
  Bot,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardList,
  Clock,
  Clock3,
  Code,
  Command,
  Copy,
  CornerDownRight,
  Crosshair,
  Cpu,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Download,
  Edit2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileArchive,
  FileImage,
  FileJson,
  FileQuestion,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileText,
  FileType,
  Film,
  Filter,
  Fingerprint,
  Flag,
  Folder,
  FolderOpen,
  Gavel,
  Github,
  Globe,
  Grid,
  GripVertical,
  HardDrive,
  Hash,
  Heart,
  HelpCircle,
  Highlighter,
  History,
  Home,
  Image,
  Inbox,
  Info,
  Landmark,
  Layers,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Link,
  Link2,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Maximize,
  Maximize2,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Microscope,
  Minimize2,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Navigation,
  Network,
  Newspaper,
  Package,
  Paperclip,
  Pause,
  Phone,
  Plane,
  Play,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  ScanText,
  Scale,
  ScrollText,
  Search,
  SearchCheck,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldClose,
  Sidebar,
  SidebarClose,
  SkipBack,
  SkipForward,
  Sliders,
  SlidersHorizontal,
  Smile,
  SortAsc,
  SortDesc,
  Sparkles,
  Square,
  Star,
  Sun,
  Sunset,
  Table,
  Tag,
  Target,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Type,
  Umbrella,
  Undo,
  Undo2,
  Unlink,
  Unlock,
  Upload,
  User,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  XCircle,
  BrainCircuit,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const icons = {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Bookmark,
  Book,
  BookOpen,
  Bot,
  BrainCircuit,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardList,
  Clock,
  Clock3,
  Code,
  Command,
  Copy,
  CornerDownRight,
  Crosshair,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Download,
  Cpu,
  Edit2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileArchive,
  FileImage,
  FileJson,
  FileQuestion,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileText,
  FileType,
  Film,
  Filter,
  Fingerprint,
  Flag,
  Folder,
  FolderOpen,
  Gavel,
  Github,
  Globe,
  Grid,
  GripVertical,
  HardDrive,
  Hash,
  Heart,
  HelpCircle,
  Highlighter,
  History,
  Home,
  Image,
  Inbox,
  Info,
  Landmark,
  Layers,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Link,
  Link2,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Maximize,
  Maximize2,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Microscope,
  Minimize2,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Navigation,
  Network,
  Newspaper,
  Package,
  Paperclip,
  Pause,
  Phone,
  Plane,
  Play,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  ScanText,
  Scale,
  ScrollText,
  Search,
  SearchCheck,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldClose,
  Sidebar,
  SidebarClose,
  SkipBack,
  SkipForward,
  Sliders,
  SlidersHorizontal,
  Smile,
  SortAsc,
  SortDesc,
  Sparkles,
  Square,
  Star,
  Sun,
  Sunset,
  Table,
  Tag,
  Target,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Type,
  Umbrella,
  Undo,
  Undo2,
  Unlink,
  Unlock,
  Upload,
  User,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  Server,
  Wifi,
  WifiOff,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
  Zap,
};

// Allow string icon names so the UI can evolve without constantly updating this file.
// Unknown icon names will fall back to a warning + null render.
export type IconName = keyof typeof icons | (string & Record<never, never>);

export interface IconProps {
  name: IconName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'white'
    | 'gray'
    | 'inherit'
    | 'black'
    | 'blue'
    | 'accent'
    | (string & Record<never, never>);
  className?: string;
  style?: CSSProperties;
  fill?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'white',
  className = '',
  style,
  fill,
  ariaLabel,
  ariaHidden = false,
}) => {
  if (name === 'Loader2' || name === 'Loader') {
    const sizeMap = {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32,
    };
    const s = sizeMap[size as keyof typeof sizeMap] || 20;

    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        style={{ ...style, display: 'inline-block', verticalAlign: 'middle' }}
        aria-label={ariaLabel || 'Loading...'}
        aria-hidden={ariaHidden}
      >
        <defs>
          <linearGradient id="bespokeLoaderGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent, #00d2ff)" stopOpacity="1" />
            <stop offset="100%" stopColor="#5e5ce6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="bespokeLoaderGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent, #00d2ff)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Outer orbital ring */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="url(#bespokeLoaderGrad1)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="42 20"
          style={{
            transformOrigin: 'center',
            animation: 'bespokeSpin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />

        {/* Inner reverse-rotating ring */}
        <circle
          cx="12"
          cy="12"
          r="6"
          stroke="url(#bespokeLoaderGrad2)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="18 10"
          style={{
            transformOrigin: 'center',
            animation: 'bespokeSpinRev 1s linear infinite',
          }}
        />

        {/* Pulsing Core */}
        <circle
          cx="12"
          cy="12"
          r="2.5"
          fill="var(--accent, #00d2ff)"
          style={{
            transformOrigin: 'center',
            animation: 'bespokePulse 1.2s ease-in-out infinite',
          }}
        />

        {/* Custom Keyframes embedded in style block */}
        <style>{`
          @keyframes bespokeSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes bespokeSpinRev {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes bespokePulse {
            0%, 100% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 3px var(--accent, #00d2ff)); }
          }
        `}</style>
      </svg>
    );
  }

  const IconComponent = icons[name as keyof typeof icons];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in local icon library`);
    return null;
  }

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'text-[var(--accent)]',
    secondary: 'text-[var(--accent-secondary)]',
    success: 'text-[var(--accent-success)]',
    warning: 'text-[var(--accent-warning)]',
    danger: 'text-[var(--accent-danger)]',
    info: 'text-[var(--accent)]',
    white: 'text-[var(--text-primary)]',
    gray: 'text-[var(--text-muted)]',
    black: 'text-[var(--bg-dark)]',
    blue: 'text-[var(--accent)]',
    accent: 'text-[var(--accent)]',
    inherit: '',
  };

  const resolvedColorClass =
    typeof color === 'string' && Object.prototype.hasOwnProperty.call(colorClasses, color)
      ? colorClasses[color as keyof typeof colorClasses]
      : '';
  const resolvedInlineColor =
    typeof color === 'string' && !Object.prototype.hasOwnProperty.call(colorClasses, color)
      ? color
      : undefined;

  const combinedClasses = `${sizeClasses[size]} ${resolvedColorClass} ${className} shrink-0`;

  return (
    <IconComponent
      className={combinedClasses}
      style={{ ...(resolvedInlineColor ? { color: resolvedInlineColor } : {}), ...style }}
      fill={fill}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
};

export default Icon;
