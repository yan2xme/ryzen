import { defineField,defineType } from 'sanity'

// for stories
export const stories = defineType({
    name: 'stories',
    type: 'document',
    title: 'Story',
    fields: [
        defineField({
            name: 'storyContent',
            type: 'image',
            title: 'storyContent',
            options: {
                hotspot: true
            }
        }),
         defineField({
            name: 'author',
            type: 'reference',
            to: [{type: 'user'}],
        }),
        defineField({
            name: 'datePosted',
            type: 'datetime',
            title: 'Date Posted',
            options: {
                dateFormat: 'MMMM DD, YYYY',
            }
        }),
        defineField({
            name: 'slug',
            type: 'slug',
            title: 'slug',
            options: {
                source: 'datePosted',
                maxLength: 96,
                slugify: input => input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
        })
    ]
})