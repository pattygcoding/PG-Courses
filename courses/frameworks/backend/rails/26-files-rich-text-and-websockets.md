---
title: Files, rich text and websockets
summary: Active Storage for uploads, Action Text for a rich editor, and Action Cable for the other direction.
chapter: The rest of the stack
minutes: 13
status: draft
---

## Active Storage

```ruby
class Book < ApplicationRecord
  has_one_attached :cover
end
```

```ruby
book.cover.attach(io: File.open("cover.jpg"), filename: "cover.jpg")
book.cover.attached?          # true
book.cover.url                # a URL, or a redirect to one
image_tag book.cover
book.cover.variant(resize_to_limit: [ 300, 300 ])
book.cover.purge              # delete the file and its rows
```

Attaching a file writes a row in `active_storage_attachments`, a row in `active_storage_blobs` with the metadata and a
checksum, and the file itself wherever the configured service puts it. The model refers to the attachment, which is why
the file can move to another service without touching the model.

```yaml
# config/storage.yml
test:
  service: Disk
  root: <%= Rails.root.join("tmp/storage") %>

local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

# amazon:
#   service: S3
#   access_key_id: <%= Rails.application.credentials.dig(:aws, :access_key_id) %>
#   secret_access_key: <%= Rails.application.credentials.dig(:aws, :secret_access_key) %>
#   region: us-east-1
#   bucket: your_own_bucket-<%= Rails.env %>
```

The generator writes the two Disk services and leaves S3, GCS and Mirror commented out. `Mirror` is the one worth
knowing: it writes to a primary and copies to others, which is how a migration from disk to a bucket happens without a
cutover.

Two decisions belong early. Files do not belong in the database, so `service: Disk` in production means the `storage/`
directory has to be a volume, which is why the generated Docker file mounts it. And a filename is attacker-controlled:
never pass it to a shell or a path, because `book.cover.filename` is data rather than a name.

Variants need `image_processing`, which `rails new` writes into the Gemfile commented out:

```ruby
gem "image_processing", "~> 1.2"
```

That brings a previewer built on `libvips` or ImageMagick, which is a system dependency the container has to install.
It is the one part of this stack that is not Ruby.

## Action Text

```bash
bin/rails action_text:install
```

```ruby
class Book < ApplicationRecord
  has_rich_text :notes
end
```

```erb
<%= form.rich_text_area :notes %>
<%= @book.notes %>
<%= @book.notes.to_plain_text %>
```

Action Text stores the HTML as a record of its own, with any attachments inside it, and gives you a Trix editor and a
sanitiser. `to_plain_text` is the method for anywhere the value is not rendered in a browser, and the install adds an
`action_text_rich_texts` table.

The decision worth making deliberately: rich text means HTML an attacker has influence over, a sanitiser to keep
current, and a rendering step that has to be trusted. For a notes field in a library, plain text and `simple_format` is
often the better answer, and being able to say why is worth more than the editor.

## Action Cable

```yaml
# config/cable.yml
development:
  adapter: async

test:
  adapter: test

production:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable
  polling_interval: 0.1.seconds
  message_retention: 1.day
```

Three adapters for the same reason as the queue and the cache: development runs it in the process, test collects without
sending, and production writes messages to a table. Solid Cable is the Rails 8 default, and those settings are how often
the apps poll and how long a message is kept for a subscriber that has not read it yet.

A channel is the server's half:

```ruby
class CatalogueChannel < ApplicationCable::Channel
  def subscribed
    stream_from "catalogue"
  end

  def receive(data)
    ActionCable.server.broadcast("catalogue", { message: data["message"] })
  end
end
```

The `ApplicationCable::Connection` class is where the signed-in user goes on the connection, and the authentication
generator wrote one for this application:

```ruby
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      if (verified_user = User.find_by(id: cookies.encrypted[:user_id]))
        verified_user
      else
        reject_unauthorized_connection
      end
    end
  end
end
```

That file is the first place to look when a websocket delivers to the wrong user: the connection is identified by
whoever connected, and a channel streaming a fixed name sends to everyone subscribed to it.

## The two-way route without a channel

The Turbo Streams page covers the better answer for most cases:

```ruby
class WaitingEntry < ApplicationRecord
  belongs_to :book
  broadcasts_to :book
end
```

```erb
<%= turbo_stream_from @book %>
```

That broadcasts the same Turbo Stream instructions that chapter sent over HTTP, and the browser applies them. No channel
class and no JavaScript, because the template already knows what to do with the result. A hand-written channel is for
what Turbo does not cover: a chat, a cursor position, a live chart.

## Check yourself

Attach a cover image to `Book`, show a variant in the catalogue list, and check where the file landed under `storage/`.
Then add `turbo_stream_from @book` to the book page with `broadcasts_to :book` on `WaitingEntry`, and confirm in two
browsers that an entry added in one appears in the other.
