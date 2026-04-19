import { defineField,defineType } from 'sanity'

export const user = defineType({
    name: 'user',
    type: 'document',
    title: 'User',
    preview:{
        select:{
            title: 'name.author'
        }
    },
    fields: [
        defineField({
            name: 'name',
            type: 'object',
            title: 'Posted by',
            fields: [
                defineField({
                    name: 'author',
                    type: 'string',
        })]
        })
    ]
})