import {Component, inject, OnInit} from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from "primeng/dynamicdialog";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { ClientService } from '../../../../services/client-managament/client.service';
import { CountryCodeService, Country } from '../../../../services/country-code.service';
import {Client, ClientRequest} from '../../../../models/client.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import {AutoCompleteModule} from "primeng/autocomplete";
import {AutoCompleteCompleteEvent} from "primeng/autocomplete";
import {MessageModule} from "primeng/message";
import {DatePickerModule} from "primeng/datepicker";

@Component({
  selector: 'app-client-modal',
  imports: [ReactiveFormsModule,MessageModule, AutoCompleteModule,CommonModule, InputNumberModule, InputTextModule, ButtonModule, ToastModule, SelectModule, DatePickerModule,FormsModule],
  templateUrl: './client-modal.component.html',
  styleUrl: './client-modal.component.css',

})
export class ClientModalComponent implements OnInit {
  clientForm: FormGroup;
  clientId: number | null = null;
  isEditing: boolean = false;
  showError: boolean = false;
  errorMessage: string = "";
  isLoading: boolean = false;
  countries: Country[] = [];
  selectedCountry!: Country;
  productos:any[] =[];
  filteredProduct:any[] = [];
  productMap = new Map<number, string>();



  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private clientService: ClientService,
    private countryCodeService: CountryCodeService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.countries = this.countryCodeService.getAllCountries();
    this.selectedCountry = this.countryCodeService.getDefaultCountry();

    this.clientForm = this.fb.group({
      userFirstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)]],
      fecha:[new Date(), ],
      producto:[this.productMap,Validators.required],
      amount: ['', Validators.required, Validators.min(1)],
      price: ['', Validators.required, Validators.min(1)],
      ingreso: [''],
      flete: [''],
      desest: [''],

    });


  }

  search(event: any) {

    const query = event.query.toLowerCase();
    this.filteredProduct = this.productos.filter(cliente =>
      cliente.nombre.toLowerCase().includes(query)
    );

console.log(this.filteredProduct);
  }

  loadProduct() {
    this.isLoading = true;

    this.clientService.getProductos().subscribe({
      next: (res) => {
        this.productos=res.data;
        console.log(this.productos);
        (res.data || []).forEach((p: any) => {
          this.productMap.set(Number(p.productoId), String(p.nombre));
        });

this.isLoading=false
      },
      error: () => {

      }
    });
  }
  getProductLabel(product: any): string {
    if (typeof product === 'string') {
      return product;
    }
    return product?.nombre || '';
  }

  getProductValue(product: any): any {
    if (typeof product === 'string') {
      return { name: product, custom: true };
    }
    return {
      id: product.productoId,

    };
  }


  ngOnInit() {
    this.loadProduct();
    this.isEditing = this.config.data.mode === 'Editar';

    if (this.isEditing && this.config.data.client) {
      const client = this.config.data.client;
      this.clientId = client.id;

      // Parsear el número de teléfono desde la BD
      const phoneData = this.countryCodeService.parsePhoneFromDatabase(client.userPhone || '');

    }
  }

  guardar() {

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const formValue = this.clientForm.value;

    const payload = {
      fecha: this.formatDateToYMD(formValue.fecha),
      cliente: formValue.userFirstName,
      productoId: String(formValue.producto?.productoId ?? ''),
      cantidad: Number(formValue.amount),
      precioVentaUnit: Number(formValue.price),
      estado: 'ACTIVA',
      gastos: [
        {
          tipo: 'FLETE',
          monto: Number(formValue.flete || 0),
          asumidoPor: 'CLIENTE'
        },
        {
          tipo: 'INGRESO',
          monto: Number(formValue.ingreso || 0),
          asumidoPor: 'CLIENTE'
        },
        {
          tipo: 'DESESTIBA',
          monto: Number(formValue.desest || 0),
          asumidoPor: 'CLIENTE'
        }
      ].filter(g => g.monto > 0)
    };

    console.log('payload => ', payload);

      this.clientService.createVenta(payload).subscribe({
        next: (result) => {
          this.isLoading = false;
          this.ref.close({
            success: true,
            data: result
          });
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(error);
        }
      });

  }

  formatDateToYMD(date: Date | string | null): string {
    if (!date) return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  cancelar() {
    this.ref.close({
      success: false
    });
  }

  onCountryChange(country: Country) {
    this.selectedCountry = country;
    this.clientForm.patchValue({ country });

    // Limpiar el teléfono cuando cambie el país
    this.clientForm.patchValue({ userPhone: '' });

    // Re-validar el campo de teléfono con el nuevo país
    const phoneControl = this.clientForm.get('userPhone');
    if (phoneControl) {
      phoneControl.updateValueAndValidity();
    }
  }


  getPhoneDisplay(): string {
    const phoneValue = this.clientForm.get('userPhone')?.value;
    if (phoneValue && this.selectedCountry) {
      return this.countryCodeService.formatForDisplay(phoneValue, this.selectedCountry);
    }
    return `+${this.selectedCountry.dialCode}`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Ingresa un numero mayor a cero`;
      if (field.errors['pattern']) {
        if (fieldName === 'userFirstName' || fieldName === 'userLastName') {
          return 'Solo se permiten letras y espacios';
        }
        if (fieldName === 'userPhone') {
          return 'Solo se permiten números';
        }
      }
      if (field.errors['email']) return 'Formato de email inválido';
      if (field.errors['phoneLength']) {
        const error = field.errors['phoneLength'];
        return `Debe tener exactamente ${error.expectedLength} dígitos para ${error.country}. Actual: ${error.actualLength}`;
      }
      if (field.errors['invalidPhone']) return `Número inválido para ${this.selectedCountry.name}`;
    }
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.clientForm.controls).forEach(key => {
      const control = this.clientForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: any) {
    this.showError = true;

    if (error.status === 400 && error.message.includes('número de teléfono')) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Ocurrió un error al procesar la solicitud. Por favor, inténtelo de nuevo.';
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: this.errorMessage
    });
  }
}
