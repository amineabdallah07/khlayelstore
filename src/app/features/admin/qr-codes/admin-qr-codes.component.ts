import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { QrService } from "../../../core/services/qr.service";
import { QrCode, QrCodeStats } from "../../../core/models/interfaces";
import { environment } from "../../../../environments/environment";

const QR_API_BASE = "https://api.qrserver.com/v1/create-qr-code";
const SIZES = ["S", "M", "L", "XL"];

@Component({
  selector: "app-admin-qr-codes",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-dark-100">Génération QR par taille</h1>
          <p class="text-dark-400 text-sm mt-1">
            Gérez les codes QR pré-générés pour chaque taille (S, M, L, XL)
          </p>
        </div>
      </div>

      @if (loading()) {
        <div class="p-12 text-center text-dark-500">
          <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Chargement...
        </div>
      } @else {
        @for (sz of sizes; track sz) {
          <div class="glass rounded-2xl overflow-hidden">
            <div class="p-5 border-b border-dark-800 flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-4">
                <span class="text-2xl font-black bg-dark-800 text-dark-100 w-12 h-12 rounded-xl flex items-center justify-center">{{ sz }}</span>
                <div>
                  <span class="text-emerald-400 font-bold text-lg">{{ getFreeForSize(sz) }}</span>
                  <span class="text-dark-500 text-sm"> libres</span>
                  <span class="mx-2 text-dark-700">·</span>
                  <span class="text-amber-400 font-bold text-lg">{{ getAssignedForSize(sz) }}</span>
                  <span class="text-dark-500 text-sm"> attribués</span>
                </div>
              </div>
              <div class="flex gap-3 items-end">
                <div>
                  <label class="text-dark-500 text-xs font-medium block mb-1">Générer</label>
                  <input
                    type="number"
                    [ngModel]="generateCounts[sz]"
                    (ngModelChange)="generateCounts[sz] = $event"
                    min="1"
                    max="1000"
                    class="w-24 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <button
                  (click)="generate(sz)"
                  [disabled]="generatingFor() === sz"
                  class="px-4 py-2 bg-primary-500 text-dark-950 font-semibold rounded-xl hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {{ generatingFor() === sz ? "..." : "Générer" }}
                </button>
                <button (click)="deleteAllFreeForSize(sz)" [disabled]="getFreeForSize(sz) === 0"
                  class="text-xs px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Suppr. libres
                </button>
              </div>
            </div>
            @if (generateMsgFor(sz); as msg) {
              <div class="px-5 py-2 text-sm" [class.text-green-400]="msg.success" [class.text-red-400]="!msg.success">
                {{ msg.text }}
              </div>
            }
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="text-left border-b border-dark-800 bg-dark-900/50">
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">N°</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Code</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Statut</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Client</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Produit</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Commande</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Date</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Détails</th>
                    <th class="p-3 text-dark-400 text-xs font-medium uppercase tracking-wider">Suppr.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (code of codesForSize(sz); track code.id) {
                    <tr class="border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors">
                      <td class="p-3 text-dark-100 font-bold text-sm">#{{ code.id }}</td>
                      <td class="p-3">
                        <code class="text-xs bg-dark-800 px-2 py-1 rounded text-primary-400 font-mono">{{ code.code.slice(0, 8) }}...</code>
                      </td>
                      <td class="p-3">
                        @if (code.status === 'FREE') {
                          <span class="text-xs px-2 py-1 rounded-lg font-medium bg-emerald-500/20 text-emerald-400">Libre</span>
                        } @else {
                          <span class="text-xs px-2 py-1 rounded-lg font-medium bg-amber-500/20 text-amber-400">Attribué</span>
                        }
                      </td>
                      <td class="p-3 text-dark-300 text-sm max-w-[120px] truncate">{{ code.customerName || "—" }}</td>
                      <td class="p-3 text-dark-300 text-sm max-w-[120px] truncate">{{ code.productName || "—" }}</td>
                      <td class="p-3 text-dark-300 text-sm">{{ code.orderNumber || "—" }}</td>
                      <td class="p-3 text-dark-400 text-sm">{{ code.createdAt | date:'dd/MM/yy' }}</td>
                      <td class="p-3">
                        <button (click)="openDetail(code)"
                          class="text-dark-400 hover:text-primary-400 transition-colors p-1.5 hover:bg-primary-500/10 rounded-lg"
                          title="Détails">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                      </td>
                      <td class="p-3">
                        <button (click)="deleteCode(code)"
                          class="text-red-500/70 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                          title="Supprimer">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="p-8 text-center text-dark-500">Aucun code QR pour cette taille</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>

    @if (selectedCode()) {
      @let code = selectedCode()!;
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/75 backdrop-blur-sm"
        (click)="selectedCode.set(null)">
        <div class="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-dark-800 flex items-center justify-between sticky top-0 bg-dark-900/95 backdrop-blur-sm">
            <h2 class="text-xl font-bold text-dark-100">Détail QR Code</h2>
            <button (click)="selectedCode.set(null)"
              class="text-dark-400 hover:text-dark-100 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-dark-500 text-xs uppercase tracking-wider">N°</p>
                <p class="text-dark-100 font-bold text-lg">#{{ code.id }}</p>
              </div>
              <div>
                <p class="text-dark-500 text-xs uppercase tracking-wider">Taille</p>
                <p class="text-dark-100 font-bold text-lg">{{ code.size || "—" }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-dark-500 text-xs uppercase tracking-wider">UUID</p>
                <p class="text-dark-100 font-mono text-xs break-all">{{ code.code }}</p>
              </div>
              <div>
                <p class="text-dark-500 text-xs uppercase tracking-wider">Statut</p>
                <p class="font-medium" [class.text-emerald-400]="code.status === 'FREE'" [class.text-amber-400]="code.status !== 'FREE'">
                  {{ code.status === 'FREE' ? 'Libre' : 'Attribué' }}
                </p>
              </div>
              @if (code.customerName) {
                <div>
                  <p class="text-dark-500 text-xs uppercase tracking-wider">Client</p>
                  <p class="text-dark-100 font-medium">{{ code.customerName }}</p>
                </div>
              }
              @if (code.productName) {
                <div>
                  <p class="text-dark-500 text-xs uppercase tracking-wider">Produit</p>
                  <p class="text-dark-100 font-medium">{{ code.productName }}</p>
                </div>
              }
              @if (code.orderNumber) {
                <div>
                  <p class="text-dark-500 text-xs uppercase tracking-wider">Commande</p>
                  <p class="text-dark-100 font-medium">{{ code.orderNumber }}</p>
                </div>
              }
            </div>

            <hr class="border-dark-800"/>

            @if (code.status === 'ASSIGNED' && code.content) {
              <div>
                <p class="text-dark-500 text-xs uppercase tracking-wider mb-2">
                  {{ code.qrType === 'PHOTO' ? '📷 Photo' : '🔗 Lien' }}
                </p>
                @if (code.qrType === 'PHOTO') {
                  <img [src]="resolvePhotoUrl(code.content)" class="w-full rounded-xl border border-dark-700 max-h-64 object-contain bg-dark-900"/>
                } @else {
                  <a [href]="code.content" target="_blank" rel="noopener noreferrer"
                    class="text-primary-400 underline break-all text-sm">{{ code.content }}</a>
                }
              </div>
              <hr class="border-dark-800"/>
            }

            <div class="text-center">
              <p class="text-dark-500 text-xs uppercase tracking-wider mb-3">QR Code Image</p>
              <p class="text-dark-400 text-xs mb-2">
                @if (code.status === 'ASSIGNED' && code.qrType === 'LINK') {
                  Le QR redirige <strong>directement</strong> vers le lien du client (302)
                } @else if (code.status === 'ASSIGNED' && code.qrType === 'PHOTO') {
                  Le QR redirige vers la page d'affichage photo
                } @else {
                  Le QR redirige vers la page d'accueil (QR non attribué)
                }
              </p>
              <div class="inline-block bg-white p-3 rounded-xl">
                <img [src]="qrImageUrl(code.code)"
                  alt="QR Code"
                  class="w-48 h-48 mx-auto" />
              </div>
              <div class="flex gap-3 justify-center mt-4">
                <a [href]="qrImageUrl(code.code)" download="qr-{{ code.code.slice(0,8) }}.png"
                  class="btn-primary text-sm flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Télécharger QR
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminQrCodesComponent implements OnInit {
  codes = signal<QrCode[]>([]);
  loading = signal(true);
  generatingFor = signal<string | null>(null);
  generateCounts: Record<string, number> = { S: 50, M: 50, L: 50, XL: 50 };
  generateMessages: Record<string, { text: string; success: boolean }> = {};
  selectedCode = signal<QrCode | null>(null);
  stats = signal<QrCodeStats | null>(null);
  sizes = SIZES;

  constructor(private qrService: QrService) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.qrService.getAllQrCodes().subscribe({
      next: (res) => {
        this.codes.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.qrService.getQrCodeStats().subscribe({
      next: (res) => this.stats.set(res.data || null),
    });
  }

  codesForSize(size: string): QrCode[] {
    return this.codes().filter(c => (c.size || '') === size);
  }

  getFreeForSize(size: string): number {
    const ps = this.stats()?.perSize;
    if (!ps) return 0;
    const key = `${size}_free` as keyof typeof ps;
    return (ps[key] as number) || 0;
  }

  getAssignedForSize(size: string): number {
    const ps = this.stats()?.perSize;
    if (!ps) return 0;
    const key = `${size}_assigned` as keyof typeof ps;
    return (ps[key] as number) || 0;
  }

  generateMsgFor(size: string): { text: string; success: boolean } | null {
    return this.generateMessages[size] || null;
  }

  generate(size: string): void {
    const count = this.generateCounts[size] || 50;
    if (count < 1) return;
    this.generatingFor.set(size);
    this.generateMessages[size] = undefined as any;
    this.qrService.generateQrCodes(count, size).subscribe({
      next: (res) => {
        this.generatingFor.set(null);
        this.generateMessages[size] = { text: `${count} codes QR (${size}) générés !`, success: true };
        this.load();
        setTimeout(() => delete this.generateMessages[size], 3000);
      },
      error: () => {
        this.generatingFor.set(null);
        this.generateMessages[size] = { text: "Erreur lors de la génération", success: false };
      },
    });
  }

  deleteCode(code: QrCode): void {
    if (!confirm(`Supprimer le QR code #${code.id} ?`)) return;
    this.qrService.deleteQrCode(code.id).subscribe({
      next: () => this.load(),
      error: () => alert("Erreur lors de la suppression"),
    });
  }

  deleteAllFreeForSize(size: string): void {
    const freeCodes = this.codes().filter(c => (c.size || '') === size && c.status === 'FREE');
    const count = freeCodes.length;
    if (count === 0) return;
    if (!confirm(`Supprimer tous les ${count} codes QR libres (${size}) ?`)) return;
    let deleted = 0;
    freeCodes.forEach(c => {
      this.qrService.deleteQrCode(c.id).subscribe({
        next: () => { deleted++; if (deleted === count) this.load(); },
        error: () => { deleted++; if (deleted === count) this.load(); },
      });
    });
  }

  openDetail(code: QrCode): void {
    this.selectedCode.set(code);
  }

  qrImageUrl(code: string): string {
    const redirectUrl = `${environment.apiUrl}/qr/r/${code}`;
    return `${QR_API_BASE}?size=300x300&data=${encodeURIComponent(redirectUrl)}`;
  }

  resolvePhotoUrl(url: string | null | undefined): string {
    if (url?.startsWith("/uploads/")) {
      return `${environment.apiUrl}${url}`;
    }
    return url || "";
  }
}
