<script>
    import {trans, trans_choice} from '../../src/svelte'

    let {name, count} = $props()
    const greeting = $derived($trans('Welcome, :name!', {name}))
    const minutes = $derived($trans_choice('{1} :count minute ago|[2,*] :count minutes ago', count))
</script>

<p data-testid="script-greeting">{greeting}</p>
<p data-testid="script-minutes">{minutes}</p>
<input data-testid="script-input" placeholder={greeting} />
