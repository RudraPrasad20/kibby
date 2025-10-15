// app/creator/page.tsx (full updated file)
'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

import Link from 'next/link'
import { useDropzone } from 'react-dropzone' // npm i react-dropzone

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { WalletConnectButton } from '@/components/walletConnectButton'

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.enum(["15", "30", "45", "60"], { error: "Duration is required" }),
  price: z.enum(["0.1", "0.2", "0.3"], { error: "Price is required" }),
})

type FormData = z.infer<typeof formSchema>

export default function CreateMeeting() {
  const { publicKey } = useWallet()
  const [loading, setLoading] = useState(false)
  const [iconFile, setIconFile] = useState<File | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: "15",
      price: "0.1",
    },
  })

  // Dropzone for icon upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIconFile(acceptedFiles[0] || null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  async function onSubmit(values: FormData) {
    if (!publicKey) {
      toast("Connect wallet first")
      return
    }

    const parsedValues = {
      ...values,
      duration: parseInt(values.duration, 10),
      price: parseFloat(values.price),
    }

    setLoading(true)
    try {
      // Upload icon if provided (Vercel Blob)
      let iconUrl = undefined
      if (iconFile) {
        const formData = new FormData()
        formData.append('file', iconFile)
        const uploadRes = await fetch('/api/upload-icon', { // New endpoint below
          method: 'POST',
          body: formData,
        })
        if (uploadRes.ok) {
          iconUrl = await uploadRes.text()
        } else {
          toast("Icon upload failed, using default")
        }
      }

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsedValues, creatorWallet: publicKey.toBase58(), iconUrl })
      })
      if (res.ok) {
        toast("Meeting created!")
        form.reset()
        setIconFile(null)
      } else {
        const errorData = await res.json()
        toast(errorData.error || "Failed to create meeting")
      }
    } catch (error) {
      console.log(error)
      toast("Error creating meeting")
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-8">
      <WalletConnectButton />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create New Meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Existing fields: title, description, duration, price */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter meeting title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter meeting description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                        <SelectItem value="60">60</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (SOL)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select price" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.1">0.1</SelectItem>
                        <SelectItem value="0.2">0.2</SelectItem>
                        <SelectItem value="0.3">0.3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          
              <Button type="submit" disabled={loading || !publicKey} className="w-full">
                {loading ? 'Creating...' : 'Create Meeting'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      {publicKey && <Link href='/creator/dashboard' className="block mt-4 text-blue-600 hover:underline">View Dashboard</Link>}
    </div>
  )
}