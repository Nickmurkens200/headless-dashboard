import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigurationService } from '../configuration/configuration.service';

interface IconInfo {
  slug: string;
  name: string;
  url: string;
  pngUrl: string;
  svgUrl?: string;
}

@Injectable()
export class IconsService {
  private iconsCache: IconInfo[] | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour

  // Known selfh.st/dashboard-icons slugs (subset - the full list is fetched from the repo)
  private readonly KNOWN_ICONS = [
    'plex', 'jellyfin', 'emby', 'sonarr', 'radarr', 'lidarr', 'prowlarr', 'bazarr',
    'overseerr', 'ombi', 'tautulli', 'portainer', 'docker', 'traefik', 'nginx',
    'grafana', 'prometheus', 'influxdb', 'elasticsearch', 'kibana', 'loki',
    'homeassistant', 'node-red', 'mosquitto', 'zigbee2mqtt', 'zwavejs2mqtt',
    'nextcloud', 'bitwarden', 'vaultwarden', 'authelia', 'authentik',
    'pihole', 'adguard-home', 'unifi', 'opnsense', 'pfsense',
    'syncthing', 'duplicati', 'restic', 'borgbackup', 'paperless-ngx',
    'gitea', 'gitlab', 'github', 'jenkins', 'drone', 'woodpecker',
    'uptime-kuma', 'healthchecks', 'statping', 'gatus',
    'caddy', 'haproxy', 'cloudflare', 'letsencrypt',
    'wireguard', 'tailscale', 'zerotier', 'netbird',
    'postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'memcached',
    'minio', 'truenas', 'unraid', 'proxmox', 'esxi', 'qnap', 'synology',
    'heimdall', 'homarr', 'homepage', 'dashy', 'organizr', 'flame',
    'qbittorrent', 'transmission', 'deluge', 'rtorrent', 'sabnzbd', 'nzbget',
    'calibre', 'kavita', 'audiobookshelf', 'booksonic',
    'navidrome', 'airsonic', 'funkwhale', 'librespot',
    'photoprism', 'immich', 'lychee', 'pigallery2',
    'code-server', 'jupyter', 'rstudio', 'octave',
    'minecraft', 'valheim', 'terraria', 'factorio',
    'mailcow', 'mailu', 'docker-mailserver', 'roundcube',
    'wordpress', 'ghost', 'hugo', 'jekyll', 'mkdocs',
    'matrix', 'mattermost', 'rocket-chat', 'element', 'discord',
    'freshrss', 'miniflux', 'tt-rss', 'newsboat',
    'firefly-iii', 'actual-budget', 'money-manager-ex',
    'mealie', 'tandoor', 'grocy', 'paprika',
    'searxng', 'whoogle', 'librex',
    'linkwarden', 'wallabag', 'shiori', 'linkding',
    'vikunja', 'wekan', 'kanboard', 'focalboard', 'planka',
    'stirling-pdf', 'docspell', 'teedy',
    'kopia', 'rclone', 'restic-rest-server',
    'speedtest-tracker', 'librespeed', 'openspeedtest',
    'ntfy', 'gotify', 'apprise',
    'glances', 'netdata', 'dozzle', 'lazydocker',
    'watchtower', 'diun', 'ouroboros',
    'crowdsec', 'fail2ban', 'wazuh',
    'frigate', 'zoneminder', 'shinobi', 'motioneye',
  ];

  constructor(private configService: ConfigurationService) {}

  async searchIcons(query: string, limit: number = 20): Promise<IconInfo[]> {
    const icons = await this.getIconsList();
    const searchLower = query.toLowerCase();

    return icons
      .filter(icon => 
        icon.slug.toLowerCase().includes(searchLower) ||
        icon.name.toLowerCase().includes(searchLower)
      )
      .slice(0, limit);
  }

  async getIconsList(): Promise<IconInfo[]> {
    // Return cached if still valid
    if (this.iconsCache && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return this.iconsCache;
    }

    const config = await this.configService.getConfig();
    const baseUrl = config.iconSourceUrl.replace(/\/+$/, '');

    // Try to fetch the directory listing or manifest from selfh.st
    try {
      // Attempt to fetch from jsdelivr API to get file list
      const response = await fetch(
        'https://data.jsdelivr.com/v1/package/gh/selfhst/icons@main',
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        const pngFiles = this.extractPngFiles(data.files || []);
        
        this.iconsCache = pngFiles.map(slug => ({
          slug,
          name: this.slugToName(slug),
          url: `${baseUrl}/${slug}.png`,
          pngUrl: `${baseUrl}/${slug}.png`,
          svgUrl: `${baseUrl.replace('/png', '/svg')}/${slug}.svg`,
        }));
      } else {
        throw new Error('Failed to fetch icon list');
      }
    } catch (error) {
      // Fallback to known icons list
      console.warn('Failed to fetch icons from CDN, using fallback list');
      this.iconsCache = this.KNOWN_ICONS.map(slug => ({
        slug,
        name: this.slugToName(slug),
        url: `${baseUrl}/${slug}.png`,
        pngUrl: `${baseUrl}/${slug}.png`,
        svgUrl: `${baseUrl.replace('/png', '/svg')}/${slug}.svg`,
      }));
    }

    this.lastFetch = Date.now();
    return this.iconsCache!;
  }

  async getIconBySlug(slug: string): Promise<IconInfo | null> {
    const icons = await this.getIconsList();
    return icons.find(icon => icon.slug === slug) || null;
  }

  async proxyIcon(slug: string): Promise<{ buffer: Buffer; contentType: string }> {
    const config = await this.configService.getConfig();
    const baseUrl = config.iconSourceUrl.replace(/\/+$/, '');
    const iconUrl = `${baseUrl}/${slug}.png`;

    try {
      const response = await fetch(iconUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new HttpException('Icon not found', HttpStatus.NOT_FOUND);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/png';

      return { buffer, contentType };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch icon', HttpStatus.BAD_GATEWAY);
    }
  }

  private extractPngFiles(files: any[], prefix: string = ''): string[] {
    const result: string[] = [];

    for (const file of files) {
      const path = prefix ? `${prefix}/${file.name}` : file.name;

      if (file.type === 'directory' && file.name === 'png') {
        // Found png directory, extract files from here
        if (file.files) {
          for (const pngFile of file.files) {
            if (pngFile.name.endsWith('.png')) {
              result.push(pngFile.name.replace('.png', ''));
            }
          }
        }
      } else if (file.type === 'directory' && file.files) {
        result.push(...this.extractPngFiles(file.files, path));
      }
    }

    return result;
  }

  private slugToName(slug: string): string {
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  invalidateCache(): void {
    this.iconsCache = null;
    this.lastFetch = 0;
  }
}
