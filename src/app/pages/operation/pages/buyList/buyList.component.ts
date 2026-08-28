import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { TableComponent } from '../../../../components/table/table.component';
import { ConfirmModalComponent } from '../../../../components/modals/confirm-modal/confirm-modal.component';
import { SellService } from '../../../../services/sell.service';
import { BuyModalComponent } from '../../modals/buy-modal/buy-modal.component';

@Component({
  selector: 'app-buy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePickerModule, InputTextModule, SelectModule, ButtonModule, ToastModule, TableComponent],
  templateUrl: './buyList.component.html',
  styleUrl: './buyList.component.css',
  providers: [DialogService, MessageService]
})
export class BuyListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  isLoading = false;
  allPurchases: any[] = [];
  data: any[] = [];
  products: { label: string; value: string }[] = [];
  filterForm = this.formBuilder.group({
    searchText: [''],
    dateRange: new FormControl<Date[] | null>(null),
    productoId: ['']
  });

  actions = [
    { icon: 'edit_square', action: (row: any) => this.edit(row) },
    { icon: 'delete', action: (row: any) => this.remove(row) }
  ];

  columns = [
    { field: 'compraId', header: 'Id' },
    { field: 'fechaFmt', header: 'Fecha' },
    { field: 'productoNombre', header: 'Producto' },
    { field: 'cantidad', header: 'Cantidad' },
    { field: 'precioCompraUnit', header: 'P. Compra' },
    { field: 'actions', header: 'Opciones', type: 'actions', actions: this.actions }
  ];

  

  constructor(
    private readonly sellService: SellService,
    private readonly dialogService: DialogService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadPurchases();
  }

  loadPurchases(): void {
    this.isLoading = true;
    this.sellService.getAllCompras().subscribe({
      next: response => {
        const purchases = response?.data || [];
        this.products = Array.isArray(response?.products) ? response.products : this.products;
        this.loadProductsAndApply(purchases);
      },
      error: error => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'No se pudieron cargar las compras' });
      }
    });
  }

  private loadProductsAndApply(purchases: any[]): void {
    this.sellService.getProductos().subscribe({
      next: response => {
        const products = Array.isArray(response?.data) ? response.data : [];
        this.products = products.map((product: any) => ({ label: String(product.nombre || `ID ${product.productoId}`), value: String(product.productoId) }));
        this.setPurchases(purchases, products);
      },
      error: () => this.setPurchases(purchases, [])
    });
  }

  private setPurchases(purchases: any[], products: any[]): void {
    const productMap = new Map(products.map(product => [String(product.productoId), String(product.nombre || '')]));
    this.allPurchases = purchases.map(purchase => ({
      ...purchase,
      productoNombre: productMap.get(String(purchase.productoId)) || `ID ${purchase.productoId}`,
      fechaFmt: this.formatDate(new Date(purchase.fecha))
    }));
    this.data = [...this.allPurchases];
    this.isLoading = false;
  }

  applyFilters(): void {
    const { searchText, dateRange, productoId } = this.filterForm.getRawValue();
    const query = String(searchText || '').trim().toLowerCase();
    const selectedProduct = String(productoId || '');
    const start = dateRange?.[0] ? this.startOfDay(dateRange[0]) : null;
    const end = dateRange?.[1] ? this.endOfDay(dateRange[1]) : null;

    this.data = this.allPurchases.filter(purchase => {
      const purchaseDate = new Date(purchase.fecha);
      const matchesQuery = !query || `${purchase.compraId} ${purchase.productoNombre}`.toLowerCase().includes(query);
      const matchesProduct = !selectedProduct || String(purchase.productoId) === selectedProduct;
      const matchesDate = (!start || purchaseDate >= start) && (!end || purchaseDate <= end);
      return matchesQuery && matchesProduct && matchesDate;
    });
  }

  clearFilters(): void {
    this.filterForm.reset({ searchText: '', dateRange: null, productoId: '' });
    this.data = [...this.allPurchases];
  }

  create(): void {
    this.openModal();
  }

  edit(purchase: any): void {
    this.openModal(purchase);
  }

  private openModal(purchase?: any): void {
    const ref = this.dialogService.open(BuyModalComponent, {
      data: { purchase },
      header: purchase ? 'Editar compra' : 'Nueva compra',
      width: '500px',
      modal: true,
      dismissableMask: true
    });
    ref.onClose.subscribe(result => {
      if (result?.success) {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: purchase ? 'Compra actualizada correctamente' : 'Compra registrada correctamente' });
        this.loadPurchases();
      }
    });
  }

  remove(purchase: any): void {
    const ref = this.dialogService.open(ConfirmModalComponent, {
      data: { detailsCupo: { title: '¿Está seguro de eliminar esta compra?', start: purchase.compraId } },
      header: 'Confirmar eliminación', width: '400px', modal: true, dismissableMask: false
    });
    ref.onClose.subscribe(confirmed => {
      if (!confirmed) return;
      this.sellService.deleteCompra(String(purchase.compraId)).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Compra eliminada correctamente' });
          this.loadPurchases();
        },
        error: error => this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'No se pudo eliminar la compra' })
      });
    });
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private startOfDay(date: Date): Date { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
  private endOfDay(date: Date): Date { const value = new Date(date); value.setHours(23, 59, 59, 999); return value; }
}
