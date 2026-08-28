import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SellService } from '../../../../services/sell.service';

@Component({
  selector: 'app-payment-modal',
  imports: [CommonModule, ReactiveFormsModule, InputNumberModule, SelectModule, ButtonModule, DatePickerModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css',
})
export class PaymentModalComponent {
  isLoading = false;
  readonly methods = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
    { label: 'Yape', value: 'YAPE' },
    { label: 'Plin', value: 'PLIN' },
    { label: 'Otro', value: 'OTRO' }
  ];

  readonly paymentForm = this.formBuilder.nonNullable.group({
    fecha: [new Date(), Validators.required],
    metodo: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly sellService: SellService,
    public readonly ref: DynamicDialogRef,
    public readonly config: DynamicDialogConfig
  ) {}

  save(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const value = this.paymentForm.getRawValue();
    const ventaId = String(this.config.data?.ventaId || '').trim();

    if (!ventaId) {
      return;
    }

    this.isLoading = true;
    this.sellService.createPago({
      ventaId,
      fecha: this.formatDate(value.fecha),
      metodo: value.metodo,
      monto: Number(value.monto)
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response?.ok === false) {
          return;
        }
        this.ref.close({ success: true });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.ref.close({ success: false });
  }

  private formatDate(value: Date): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
