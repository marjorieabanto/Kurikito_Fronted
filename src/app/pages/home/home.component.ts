import { Component, OnInit } from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {SelectModule} from "primeng/select";
import {DatePickerModule} from "primeng/datepicker";
import {InputTextModule} from "primeng/inputtext";
import {ButtonModule} from "primeng/button";
import {TableComponent} from "../../components/table/table.component";
import {DialogService, DynamicDialogRef} from "primeng/dynamicdialog";
import {ActivatedRoute, Router} from "@angular/router";
import {AuthService} from "../../services/auth.service";
import {NewReminderComponent} from "./modals/new-reminder/new-reminder.component";
import {ReminderService} from "../../services/client-managament/reminder.service";
import {Reminder} from "../../models/reminder.model";

@Component({
  selector: 'app-home',
  imports: [CommonModule,FormsModule, SelectModule,DatePickerModule,InputTextModule,ButtonModule,TableComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  standalone:true,
  providers: [ DialogService],

})
export class HomeComponent  {


  firstStep:boolean=true;

  selectedMenu = '';

  tiles: any[] = [
    { id:1,icon: 'groups_2', line2: 'Mis clientes', route: '/home/app',status: true },
    { id:2,icon: 'sell',    line2: 'Mis ventas', route: '/main/operation/list-clients' ,status: true},
    {  id:3,icon: 'trolley',line1: 'Mis compras'
      ,brand: true, route: '/home/app' ,status: true},
    { id:4,icon: 'inventory',             line1: 'Mi inventario', route: '/home/app',status: true},
    { id:5,icon: 'list_alt_check',           line1: 'Reportes', route: '/home/app' ,status: true},
    ];

  constructor(

    private router: Router,

  ) {
  }

  onClick(item:any){
    this.selectedMenu = item.id;
    if(item.id!=8) {
      const segments = (item.status==false)
        ? [item.route, 'modal']
        : [item.route];


      this.router.navigate(segments);
    }
    this.firstStep=false;


  }



}
