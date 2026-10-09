import {
  AlertCircle,
  AlignJustify,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Ban,
  Bell,
  Bolt,
  ChartBar,
  ChartBarBig,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleGauge,
  CircleHelp,
  Cookie,
  Cpu,
  Disc3,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Headset,
  Home,
  Hash,
  Info,
  KeyRound,
  Keyboard,
  LogOut,
  type LucideProps,
  Menu as MenuIcon,
  Minus,
  MoreVertical,
  Moon,
  Pause,
  Play,
  Plus,
  QrCode,
  Repeat,
  Rocket,
  RotateCcw,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Smartphone,
  Square,
  Sun,
  SunMoon,
  Trash2,
  Turntable,
  Upload,
  Usb,
  User,
  Users,
  VolumeX,
  X
} from "lucide-react";
import {
  type SimpleIcon,
  siDiscord,
  siFacebook,
  siGithub,
  siGoogle,
  siInstagram,
  siSoundcloud,
  siSpotify,
  siTiktok,
  siX,
  siYoutube
} from "simple-icons";

type IconSizeVariant = "sm" | "md" | "lg" | "xl";

interface IconProps extends Omit<LucideProps, "size"> {
  size?: IconSizeVariant;
}

interface IconConfig extends Partial<LucideProps> {
  size?: IconSizeVariant;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

const iconConfig: IconConfig = {
  size: "md",
  strokeWidth: 2,
  absoluteStrokeWidth: false,
  color: "currentColor"
};

const iconSizes = {
  sm: "2.25rem",
  md: "3rem",
  lg: "4rem",
  xl: "5rem"
};

const withConfig = (IconComponent: any) => {
  return (props: IconProps) => {
    const {
      size: sizeProp,
      className,
      style: styleProp,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-hidden": ariaHidden,
      role,
      ...restProps
    } = props;
    const size = sizeProp || iconConfig.size;
    const hasLabel = Boolean(ariaLabel || ariaLabelledBy);

    const sizeMap: Record<string, string> = {
      sm: iconSizes.sm,
      md: iconSizes.md,
      lg: iconSizes.lg,
      xl: iconSizes.xl
    };

    const a11yProps = {
      role: role || (hasLabel ? "img" : undefined),
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-hidden": ariaHidden ?? !hasLabel,
      focusable: hasLabel ? undefined : "false"
    };

    if (typeof size === "string") {
      const remValue = sizeMap[size];
      if (remValue) {
        const style = {
          ...styleProp,
          flexShrink: 0,
          width: remValue,
          height: remValue
        };
        return (
          <IconComponent
            {...iconConfig}
            {...restProps}
            {...a11yProps}
            className={className}
            style={style}
            size={undefined}
          />
        );
      }
    }

    return (
      <IconComponent
        {...iconConfig}
        {...restProps}
        {...a11yProps}
        className={className}
        style={styleProp}
        size={size}
      />
    );
  };
};

interface SimpleIconProps extends Omit<LucideProps, "size"> {
  size?: IconSizeVariant;
}

interface SvgIconPath {
  d: string;
  fill?: string;
}

const withSvgPaths = (paths: SvgIconPath[]) => {
  return (props: SimpleIconProps) => {
    const {
      size: sizeProp,
      color,
      className,
      style: styleProp,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-hidden": ariaHidden,
      role,
      ...restProps
    } = props;
    const size = sizeProp || iconConfig.size;
    const fillColor = color || iconConfig.color || "currentColor";
    const hasLabel = Boolean(ariaLabel || ariaLabelledBy);

    const sizeMap: Record<string, string> = {
      sm: iconSizes.sm,
      md: iconSizes.md,
      lg: iconSizes.lg,
      xl: iconSizes.xl
    };

    const remValue = typeof size === "string" ? sizeMap[size] : null;
    const finalSize = remValue || iconSizes.md;

    const style = {
      ...styleProp,
      flexShrink: 0,
      width: finalSize,
      height: finalSize
    };

    return (
      <svg
        role={role || (hasLabel ? "img" : undefined)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-hidden={ariaHidden ?? !hasLabel}
        focusable={hasLabel ? undefined : "false"}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        {...restProps}
      >
        {paths.map((p) => (
          <path key={p.d} d={p.d} fill={p.fill || fillColor} />
        ))}
      </svg>
    );
  };
};

const withSimpleIcon = (simpleIcon: SimpleIcon) => withSvgPaths([{ d: simpleIcon.path }]);

const googleBrandPaths: SvgIconPath[] = [
  {
    d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
    fill: "#4285F4"
  },
  {
    d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
    fill: "#34A853"
  },
  {
    d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
    fill: "#FBBC05"
  },
  {
    d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
    fill: "#EA4335"
  }
];

const Icon = {
  Home: withConfig(Home),
  Menu: withConfig(AlignJustify),
  Burger: withConfig(MenuIcon),
  Support: withConfig(Headset),
  ChevronDown: withConfig(ChevronDown),
  ChevronRight: withConfig(ChevronRight),
  ChevronLeft: withConfig(ChevronLeft),
  ChevronUp: withConfig(ChevronUp),
  Plus: withConfig(Plus),
  Minus: withConfig(Minus),
  X: withConfig(X),
  Check: withConfig(Check),
  Circle: withConfig(Circle),
  Info: withConfig(Info),
  CircleHelp: withConfig(CircleHelp),
  Search: withConfig(Search),
  MoreVertical: withConfig(MoreVertical),
  ArrowLeft: withConfig(ArrowLeft),
  ArrowRight: withConfig(ArrowRight),
  ArrowUp: withConfig(ArrowUp),
  ArrowDown: withConfig(ArrowDown),
  ArrowUpDown: withConfig(ArrowUpDown),
  Share: withConfig(Share2),

  Play: withConfig(Play),
  Pause: withConfig(Pause),
  Stop: withConfig(Square),
  Repeat: withConfig(Repeat),
  Reset: withConfig(RotateCcw),
  Shuffle: withConfig(Shuffle),
  Disc3: withConfig(Disc3),
  CircleGauge: withConfig(CircleGauge),
  Turntable: withConfig(Turntable),
  VolumeX: withConfig(VolumeX),

  Google: withSimpleIcon(siGoogle),
  GoogleColor: withSvgPaths(googleBrandPaths),
  Github: withSimpleIcon(siGithub),
  Twitter: withSimpleIcon(siX),
  Youtube: withSimpleIcon(siYoutube),
  Facebook: withSimpleIcon(siFacebook),
  Instagram: withSimpleIcon(siInstagram),
  Tiktok: withSimpleIcon(siTiktok),
  Spotify: withSimpleIcon(siSpotify),
  Soundcloud: withSimpleIcon(siSoundcloud),
  Discord: withSimpleIcon(siDiscord),
  Hardware: withConfig(Cpu),
  Cpu: withConfig(Cpu),

  ChartBar: withConfig(ChartBar),
  ChartBarBig: withConfig(ChartBarBig),
  Bell: withConfig(Bell),
  Bolt: withConfig(Bolt),
  ArrowUpRight: withConfig(ArrowUpRight),
  Download: withConfig(Download),
  Upload: withConfig(Upload),
  Rocket: withConfig(Rocket),
  Trash: withConfig(Trash2),
  Ban: withConfig(Ban),
  Settings2: withConfig(Settings2),
  SlidersHorizontal: withConfig(SlidersHorizontal),
  Cookie: withConfig(Cookie),
  Edit: withConfig(Edit3),

  Eye: withConfig(Eye),
  EyeOff: withConfig(EyeOff),
  KeyRound: withConfig(KeyRound),
  Keyboard: withConfig(Keyboard),
  LogOut: withConfig(LogOut),
  ShieldCheck: withConfig(ShieldCheck),
  AlertCircle: withConfig(AlertCircle),

  Smartphone: withConfig(Smartphone),
  Usb: withConfig(Usb),
  QrCode: withConfig(QrCode),

  Globe: withConfig(Globe),
  Hash: withConfig(Hash),
  User: withConfig(User),
  Users: withConfig(Users),

  Sun: withConfig(Sun),
  Moon: withConfig(Moon),
  SunMoon: withConfig(SunMoon)
};

export type IconName = keyof typeof Icon;

export { Icon, iconConfig, iconSizes };
