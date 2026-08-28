import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SellService } from '../../../../services/sell.service';

@Component({
  selector: 'app-buy-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule, MessageModule],
  templateUrl: './buy-modal.component.html',
  styleUrl: './buy-modal.component.css'
})
export class BuyModalComponent {
  isLoading = false;
  products: any[] = [];
  readonly today = new Date();
  readonly form = this.formBuilder.group({
    fecha: [new Date(), [Validators.required, BuyModalComponent.notFutureDateValidator]],
    productoId: ['', [Validators.required]],
    cantidad: [0, [Validators.required, Validators.min(0.01)]],
    precioCompraUnit: [0, [Validators.required, Validators.min(0.01)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly sellService: SellService,
    public readonly ref: DynamicDialogRef,
    public readonly config: DynamicDialogConfig
  ) {
    this.sellService.getProductos().subscribe({
      next: response => {
        const products = Array.isArray(response?.data) ? response.data : [];
        this.products = products.map((product: any) => ({
          ...product,
          productoId: String(product.productoId)
        }));
      }
    });

    const purchase = config.data?.purchase;
    if (purchase) {
      this.form.patchValue({
        fecha: this.parseDate(purchase.fecha),
        productoId: String(purchase.productoId ?? ''),
        cantidad: Number(purchase.cantidad),
        precioCompraUnit: Number(purchase.precioCompraUnit)
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      ...(this.config.data?.purchase || {}),
      fecha: this.formatDate(value.fecha),
      productoId: String(value.productoId),
      cantidad: Number(value.cantidad),
      precioCompraUnit: Number(value.precioCompraUnit)
    };
    const request = this.config.data?.purchase
      ? this.sellService.updateCompra(payload)
      : this.sellService.createCompra(payload);

    this.isLoading = true;
    request.subscribe({
      next: response => {
        this.isLoading = false;
        this.ref.close({ success: response?.ok !== false });
      },
      error: () => this.isLoading = false
    });
  }

  hasError(controlName: 'fecha' | 'productoId' | 'cantidad' | 'precioCompraUnit', error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  cancel(): void {
    this.ref.close({ success: false });
  }

  private formatDate(value: Date | null): string {
    const date = new Date(value || new Date());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseDate(value: unknown): Date {
    const date = new Date(String(value || ''));
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private static readonly notFutureDateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const selected = new Date(control.value);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected > today ? { futureDate: true } : null;
  };
}
