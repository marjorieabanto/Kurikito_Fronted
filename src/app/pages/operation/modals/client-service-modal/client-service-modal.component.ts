import {Component, OnInit} from '@angular/core';
import {DialogService, DynamicDialogConfig, DynamicDialogRef} from "primeng/dynamicdialog";
import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {InputNumberModule} from "primeng/inputnumber";
import {InputTextModule} from "primeng/inputtext";
import {ButtonModule} from "primeng/button";
import {SelectModule} from "primeng/select";
import {DatePickerModule} from "primeng/datepicker";
import {MessageService} from "primeng/api";
import {ServiceService} from "../../../../services/client-managament/service.service";
import {ClientService} from "../../../../services/sell.service";
import {ClientServiceService} from "../../../../services/client-managament/client-service.service";
import {AutoCompleteModule} from "primeng/autocomplete";


@Component({
  selector: 'app-client-service-modal',
  imports: [AutoCompleteModule,FormsModule,CommonModule,InputNumberModule,InputTextModule,ButtonModule,SelectModule,DatePickerModule],
  templateUrl: './client-service-modal.component.html',
  styleUrl: './client-service-modal.component.css'
})
export class ClientServiceModalComponent implements OnInit{

  formData: any = {
    cliente: null,
    servicio: null,
    fecha: null,
    paymentFrequency: null,
    amount: null,
    active:true
  };
  name:any= null;
  peso: any = 0.000 ;
  serviceSelected:any=null;
  paymentSelected:any=null;
  dateRange: Date[] | undefined;

  filteredClients: any[] = [];

  clients: any[] = []
  services: any[] = [];

  payments: any[] = [
    { id: 'QUINCENAL', name: 'Quincenal' },
    { id: 'FIN_DE_MES', name: 'Fin de mes' }
  ];
  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig,private messageService: MessageService,public serviceService: ServiceService, public clientService: ClientService,public service:ClientServiceService,public dialogService: DialogService) {

    this.loadClients();
    this.loadService();

  }

  ngOnInit() {
    if (this.config.data.name === 'Editar' && this.config.data.initialData) {
      const row = this.config.data.initialData;

      console.log(row);
      this.formData = {
        cliente: row.client ?? null,
        servicio: row.service?.id ?? null,
        fecha: row.issueDate && row.dueDate ? [new Date(row.issueDate), new Date(row.dueDate)] : null,
        paymentFrequency: row.paymentFrequency ?? null,
        amount: row.amount ?? 0
      };
    }
  }



  loadClients() {
    this.clientService.getAllClients().subscribe({
      next: (response) => {
        console.log('API Response:', response)
        // Check if response has clients property (API returns object with clients array)
        if (response && response.clients) {
          this.clients = response.clients;
        } else if (Array.isArray(response)) {
          // If it's directly an array
          this.clients = response;
        } else {
          console.error('Unexpected response format:', response);
          this.clients = [];
        }
        
        // Add full name property for display
        this.clients = this.clients.map(client => ({
          ...client,
          fullName: `${client.userFirstName} ${client.userLastName}`
        }));
        
        console.log('Clients array:', this.clients)

      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los clientes'
        });
        this.clients = [];
      }
    });


    return this.clients;
  }

  loadService() {
    this.serviceService.getAllServices().subscribe({
      next: (s) => {
        console.log(s)

        this.services=s;
      //  this.fields[1].options= s

      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los clientes'
        });

      }
    });

  }

  filterClients(event: any) {
    const query = event.query.toLowerCase();
    this.filteredClients = this.clients.filter(cliente =>
      cliente.fullName.toLowerCase().includes(query)
    );
  }

  handleClientServiceAdded(payload: any): void {
    this.service.createClientService(payload).subscribe({
      next: (data) => {
        console.log('Servicio de cliente creado con éxito:', data);
        this.ref.close(true); // ← solo se cierra si fue exitoso
      },
      error: (err) => {
        console.error('Error al crear el servicio:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el servicio de cliente.'
        });
      }
    });
  }

  handleClientServiceSet(id: number, payload: any): void {
    this.service.updateClientService(id, payload).subscribe({
      next: (updated) => {
        console.log('Servicio actualizado:', updated);
        this.ref.close(true);
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el servicio de cliente.'
        });
      }
    });
  }

  formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }



  guardar() {
    const payload = {
      clientId: this.formData.cliente?.id ?? null,
      serviceId: this.formData.servicio ?? null,
      issueDate: this.formData.fecha?.[0] ? this.formatDate(this.formData.fecha[0]) : null,
      dueDate: this.formData.fecha?.[1] ? this.formatDate(this.formData.fecha[1]) : null,
      paymentFrequency: this.formData.paymentFrequency,
      amount: this.formData.amount,
      active:true
    };

    console.log('Payload a enviar:', payload);

    if (this.config.data.name === 'Editar') {
      const id = this.config.data.id; // o pásalo como parte de initial data
      this.handleClientServiceSet(id, payload);
    } else if (this.config.data.name === 'Crear') {
      this.handleClientServiceAdded(payload);
    }


  }


  cancelar() {
    this.ref.close(false);
  }
}
