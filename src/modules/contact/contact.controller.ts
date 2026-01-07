import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { error, success } from 'src/helpers/http.helper';
import { AddContactDto, ContactService, DeleteContactDto } from './contact.service';
import { ObjectId } from 'mongodb';

@Controller('contacts')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
  ) { }

  @Get(':ownerId')
  async getContacts(
    @Param('ownerId') ownerId: string
  ) {
    const result = await this.contactService.getContacts(
      new ObjectId(ownerId),
    );
    return success('Contacts', result);
  }

  @Post('')
  async createContact(
    @Body() createContactDto: AddContactDto
  ) {
    try {
      const result = await this.contactService.create(createContactDto);
      return success('Contact added', result);
    } catch (exception) {
      throw error(exception.message);
    }
  }

  @Delete('')
  async deleteContact(
    @Body() deleteContactDto: DeleteContactDto
  ) {
    try {
      const result = await this.contactService.delete(deleteContactDto);
      return success('Contact deleted', result);
    } catch (exception) {
      throw error(exception.message);
    }
  }
}
