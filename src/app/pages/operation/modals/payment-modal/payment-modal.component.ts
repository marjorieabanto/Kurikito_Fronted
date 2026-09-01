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

  cuentaOptions: any[] =[];

  //readonly cuentaOptions = this.config.data?.cuentaOptions ?? [{ label: 'Cuenta del cliente', value: '' }];
  readonly deudaActual = Number(this.config.data?.deudaActual ?? 0);
  excedente = 0;
  showExcessAlert = false;

  readonly paymentForm = this.formBuilder.nonNullable.group({
    fecha: [new Date(), Validators.required],
    metodo: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    cuentaDestinoVentaId: ['']
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly sellService: SellService,
    public readonly ref: DynamicDialogRef,
    public readonly config: DynamicDialogConfig
  ) {
    this.paymentForm.controls.monto.valueChanges.subscribe((value) => {
      const monto = Number(value ?? 0);
      this.excedente = Math.max(0, monto - this.deudaActual);
      this.showExcessAlert = this.excedente > 0;
      if(this.showExcessAlert){
        this.loadCuentasOpc();
      }
    });
  }

  loadCuentasOpc(){

this.sellService.getVentasPorCliente(this.config.data.cliente).subscribe({
next: (response) => {
      
        if (response?.ok === false) {
          return;
        }
        this.cuentaOptions= response.data.filter((venta: any) => venta.ventaId !== this.config.data.ventaId).map((venta: any) => ({
          label: venta.productoName+ ' - ' + venta.fecha,
          value: venta.ventaId
        }));
        
      },
      error: () => {
        this.isLoading = false;
      }


})

  }

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
      cliente: String(this.config.data?.cliente || ''),
      ventaId,
      fecha: this.formatDate(value.fecha),
      metodo: value.metodo,
      monto: Number(value.monto),
      cuentaDestinoVentaId: value.cuentaDestinoVentaId || ''
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
