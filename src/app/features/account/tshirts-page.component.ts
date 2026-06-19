import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { QrService } from "../../core/services/qr.service";
import { QrOrderItem } from "../../core/models/interfaces";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-tshirts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pt-24 pb-20">
      <div class="page-container max-w-2xl">
        <h1 class="text-4xl font-black text-dark-100 mb-8">MES T-SHIRTS QR</h1>

        <div class="glass rounded-2xl p-8">
          @if (loading()) {
            <div class="flex justify-center py-8">
              <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          } @else if (items().length === 0) {
            <div class="text-center py-8">
              <svg class="w-16 h-16 text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/>
              </svg>
              <p class="text-dark-400">Aucun T-shirt QR livré pour le moment.</p>
              <p class="text-dark-600 text-sm mt-2">Les T-shirts apparaissent ici une fois votre commande livrée.</p>
            </div>
          } @else {
            <div class="space-y-4">
              @for (item of items(); track item.id) {
                <div class="bg-dark-800/50 rounded-xl p-5 border border-dark-700 cursor-pointer hover:border-primary-500/50 transition-all"
                  (click)="selectItem(item)">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-dark-100 font-bold text-lg">{{ item.productName }}</p>
                      <p class="text-dark-500 text-sm mt-1">
                        {{ item.qrType === 'PHOTO' ? '📷 Photo' : '🔗 Lien' }} ·
                        Commande {{ item.orderNumber }} ·
                        {{ item.createdAt | date:'dd/MM/yyyy' }}
                      </p>
                    </div>
                    <div class="text-primary-400">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <a routerLink="/account" class="block mt-6 text-dark-500 hover:text-primary-400 text-sm transition-colors">
            ← Retour au compte
          </a>
        </div>
      </div>
    </div>

    @if (selectedItem(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/75 backdrop-blur-sm"
        (click)="selectedItem.set(null)">
        <div class="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-dark-800 flex items-center justify-between sticky top-0 bg-dark-900/95 backdrop-blur-sm">
            <h2 class="text-xl font-bold text-dark-100">{{ item.productName }}</h2>
            <button (click)="selectedItem.set(null)"
              class="text-dark-400 hover:text-dark-100 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-5">
            <div class="flex items-center gap-2 text-sm text-dark-400">
              <span class="text-xs px-2 py-0.5 rounded-lg font-medium"
                [ngClass]="item.qrType === 'PHOTO' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'">
                {{ item.qrType === 'PHOTO' ? '📷 Photo' : '🔗 Lien' }}
              </span>
              <span>Commande {{ item.orderNumber }}</span>
            </div>

            @if (item.qrType === 'LINK') {
              <div>
                <label class="text-dark-500 text-xs uppercase tracking-wider block mb-2">Votre lien</label>
                <input
                  type="url"
                  [(ngModel)]="editContent"
                  class="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500/50 text-sm"
                  placeholder="https://..."
                />
                @if (saving()) {
                  <p class="text-primary-400 text-sm mt-2">Sauvegarde...</p>
                } @else if (saveSuccess()) {
                  <p class="text-green-400 text-sm mt-2">Lien modifié avec succès !</p>
                } @else if (saveError()) {
                  <p class="text-red-400 text-sm mt-2">{{ saveError() }}</p>
                }
              </div>
            } @else {
              <div>
                <label class="text-dark-500 text-xs uppercase tracking-wider block mb-2">Votre photo</label>
                <img [src]="resolvePhotoUrl(editContent)" alt="QR Photo"
                  class="w-full rounded-xl border border-dark-700 max-h-64 object-contain bg-dark-900"/>
              </div>
            }

            <div class="text-center">
              <p class="text-dark-500 text-xs uppercase tracking-wider mb-3">QR Code</p>
              <div class="inline-block bg-white p-3 rounded-xl">
                <img [src]="qrImageUrl(item.qrCode)" alt="QR Code" class="w-40 h-40 mx-auto" />
              </div>
              <p class="text-dark-600 text-xs mt-2">Scannez ce code pour accéder à votre contenu</p>
            </div>

            @if (item.qrType === 'LINK') {
              <div class="flex gap-3">
                <button (click)="saveContent(item)"
                  [disabled]="saving() || !editContent"
                  class="flex-1 px-5 py-3 bg-primary-500 text-dark-950 font-semibold rounded-xl hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {{ saving() ? "Sauvegarde..." : "Modifier le lien" }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class TshirtsPageComponent implements OnInit {
  items = signal<QrOrderItem[]>([]);
  loading = signal(true);
  selectedItem = signal<QrOrderItem | null>(null);
  editContent = "";
  saving = signal(false);
  saveSuccess = signal(false);
  saveError = signal("");

  constructor(private qrService: QrService) {}

  ngOnInit(): void {
    this.qrService.getMyQrShirts().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.items.set(res.data);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  saveContent(item: QrOrderItem): void {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set("");
    this.qrService.updateMyQrContent(item.qrCode, this.editContent).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set("Erreur lors de la modification");
      },
    });
  }

  selectItem(item: QrOrderItem): void {
    this.selectedItem.set(item);
    this.editContent = item.content || "";
    this.saveSuccess.set(false);
    this.saveError.set("");
  }

  qrImageUrl(code: string): string {
    const redirectUrl = `${environment.apiUrl}/qr/r/${code}`;
    return `https://api.qrserver.com/v1/create-qr-code?size=200x200&data=${encodeURIComponent(redirectUrl)}`;
  }

  resolvePhotoUrl(url: string | undefined | null): string {
    if (url?.startsWith("/uploads/")) {
      return `${environment.apiUrl}${url}`;
    }
    return url || "";
  }
}
