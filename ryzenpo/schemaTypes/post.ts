import { defineField,defineType } from 'sanity'

// for blog post
export const post = defineType({
    name: 'post',
    type: 'document',
    title: 'Blog Post',
    fields: [
        defineField({
            name: 'title',
            type: 'string',
            title: 'Post Title'
        }),
        defineField({
            name: 'datePosted',
            type: 'date',
            title: 'Date Posted',
            options: {
                dateFormat: 'MMMM DD, YYYY',
            }
        }),
        defineField({
            name: 'author',
            type: 'reference',
            to: [{type: 'user'}],
        }),
        defineField({
            name: 'blogPosterImage',
            type: 'image',
            title: 'Blog Poster Image',
            options: {
                hotspot: true
            }
        }),
        defineField({
            name: 'content',
            type: 'array',
            title: 'Content',
            of: [{type: 'block'}]
        }),
        defineField({
            name: 'slug',
            type: 'slug',
            title: 'slug',
            options: {
                source: 'title',
                maxLength: 96,
                slugify: input => input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            }
        })
    ]
} )