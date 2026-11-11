import { photoUrl } from '../services/api.js';
import { avatarColors, avatarInitial } from '../services/avatar.js';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// A reader's avatar: their uploaded photo when present, otherwise a stable,
// on-brand fallback (deterministic colour + initial) that never changes between
// renders or visits for the same user. `alt` defaults to empty so the avatar is
// decorative next to a visible name; pass a label when it stands alone.
export default function BrandAvatar({ user, className, fallbackClassName, alt = '' }) {
  const src = user?.avatarUrl ? photoUrl(user.avatarUrl) : undefined;
  const colors = avatarColors(user);
  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback
        className={cn('font-semibold', fallbackClassName)}
        style={{ backgroundColor: colors.bg, color: colors.fg }}
      >
        {avatarInitial(user)}
      </AvatarFallback>
    </Avatar>
  );
}
